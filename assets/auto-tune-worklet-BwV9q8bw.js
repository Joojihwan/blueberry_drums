// src/worklets/auto-tune-worklet.js

const A4_FREQ = 440;
const A4_MIDI = 69;

// Hz → MIDI
function freqToMidi(freq) {
  if (!isFinite(freq) || freq <= 0) return null;
  return A4_MIDI + 12 * Math.log2(freq / A4_FREQ);
}

// MIDI → Hz
function midiToFreq(midi) {
  return A4_FREQ * Math.pow(2, (midi - A4_MIDI) / 12);
}

/**
 * pitch classes: [0,2,4,5,7,9,11] 이런 형태 (0=C, 1=C#, ..., 11=B)
 * freq를 이 pitch class들로 구성된 스케일에 가장 가까운 음으로 스냅
 */
function snapFrequencyToPitchClasses(freq, pitchClasses) {
  if (!isFinite(freq) || freq <= 0 || !pitchClasses || pitchClasses.length === 0) {
    return freq;
  }
  const midi = freqToMidi(freq);
  if (midi === null) return freq;

  const baseOct = Math.floor(midi / 12);

  let bestMidi = midi;
  let bestDist = Number.POSITIVE_INFINITY;

  for (let oct = baseOct - 2; oct <= baseOct + 2; oct++) {
    const base = oct * 12;
    for (let i = 0; i < pitchClasses.length; i++) {
      const pc = pitchClasses[i];
      const candidateMidi = base + pc;
      const dist = Math.abs(candidateMidi - midi);
      if (dist < bestDist) {
        bestDist = dist;
        bestMidi = candidateMidi;
      }
    }
  }

  return midiToFreq(bestMidi);
}

function getPitchShiftRatioForPitchClasses(freq, pitchClasses) {
  if (!isFinite(freq) || freq <= 0) return 1.0;
  const targetFreq = snapFrequencyToPitchClasses(freq, pitchClasses);
  if (!isFinite(targetFreq) || targetFreq <= 0) return 1.0;
  return targetFreq / freq;
}

/**
 * 매우 단순한 autocorrelation 기반 피치 검출
 * 반환: Hz (검출 실패 시 null)
 */
function detectPitchAutocorrelation(frame, sampleRate) {
  const size = frame.length;
  if (size < 64) return null;

  // DC offset 제거
  let mean = 0;
  for (let i = 0; i < size; i++) {
    mean += frame[i];
  }
  mean /= size;

  const buf = new Float32Array(size);
  let sumSq = 0;
  for (let i = 0; i < size; i++) {
    const v = frame[i] - mean;
    buf[i] = v;
    sumSq += v * v;
  }
  if (sumSq < 1e-7) return null;

  const maxLag = Math.min(1024, size - 1);
  const minLag = Math.floor(sampleRate / 800);   // ~800Hz
  const maxLagForLow = Math.floor(sampleRate / 80); // ~80Hz

  let bestLag = -1;
  let bestCorr = 0;

  for (let lag = minLag; lag <= Math.min(maxLag, maxLagForLow); lag++) {
    let sum = 0;
    for (let i = 0; i < size - lag; i++) {
      sum += buf[i] * buf[i + lag];
    }
    if (sum > bestCorr) {
      bestCorr = sum;
      bestLag = lag;
    }
  }

  if (bestLag <= 0 || bestCorr < 1e-4) return null;

  const freq = sampleRate / bestLag;
  return freq;
}

class AutoTuneProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.sampleRate_ = sampleRate;

    // 기본 스케일: C Major
    this.pitchClasses = [0, 2, 4, 5, 7, 9, 11];

    // 0~1, 1이면 강하게 스냅
    this.retuneAmount = 1.0;

    // pitch detection용 버퍼
    this.analysisSize = 2048;
    this.analysisBuffer = new Float32Array(this.analysisSize);
    this.analysisWritePos = 0;

    this.currentRatio = 1.0;
    this.lastGoodRatio = 1.0;

    this.loggedOnce = false;

    this.port.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === "scale-pc" && Array.isArray(data.pitchClasses)) {
        this.pitchClasses = data.pitchClasses.map((x) => ((x % 12) + 12) % 12);
      } else if (data.type === "retune-amount") {
        const v = data.value;
        if (typeof v === "number") {
          this.retuneAmount = Math.max(0, Math.min(1, v));
        }
      }
    };
  }

  updatePitchDetection(inputChannel) {
    const N = inputChannel.length;
    for (let i = 0; i < N; i++) {
      this.analysisBuffer[this.analysisWritePos] = inputChannel[i];
      this.analysisWritePos = (this.analysisWritePos + 1) % this.analysisSize;
    }

    const frame = new Float32Array(this.analysisSize);
    const start = this.analysisWritePos;
    let idx = 0;
    for (let i = 0; i < this.analysisSize; i++) {
      const pos = (start + i) % this.analysisSize;
      frame[idx++] = this.analysisBuffer[pos];
    }

    const freq = detectPitchAutocorrelation(frame, this.sampleRate_);
    if (!freq) {
      // 검출 실패 시 약하게 1 쪽으로 복귀
      this.currentRatio = 0.9 * this.currentRatio + 0.1 * 1.0;
      return;
    }

    let rawRatio = getPitchShiftRatioForPitchClasses(freq, this.pitchClasses);

    // 더 과격하게: 클램프 범위 확장
    rawRatio = Math.max(0.1, Math.min(5.0, rawRatio));

    // ===== 스냅 강도 계산 (여기가 포인트) =====
    // retuneAmount ↑ 일수록 훨씬 강하게 스냅
    // 0.0 → 거의 안 튐, 1.0 → 최대한 타겟 음으로 끌어당김
    let strength = this.retuneAmount;

    // 하드 튠 쪽은 좀 더 과감하게 (감마 보정)
    // retuneAmount 0.7 이상이면 사실상 full snap 느낌
    if (strength > 0.0) {
        strength = Math.pow(strength, 0.4)
      strength = Math.min(1, strength * 2.5); // 0~1.0 범위 압축
    }

    // strength=0 → ratio=1, strength=1 → ratio=rawRatio
    const blended = 1 + (rawRatio - 1) * strength;

    // smoothing을 줄여서 더 과격하게 반응하게 (기존보다 훨씬 aggressive)
    this.currentRatio = 0.1 * this.currentRatio + 0.9 * blended;
    this.lastGoodRatio = this.currentRatio;
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || input.length === 0 || !output || output.length === 0) {
      return true;
    }

    const inCh = input[0];
    const outCh = output[0];

    if (!inCh || !outCh) {
      return true;
    }

    const N = inCh.length;

    if (!this.loggedOnce) {
      this.loggedOnce = true;
      console.log("[AutoTuneProcessor] aggressive scale-based pitch correction");
    }

    // retuneAmount가 거의 0이면 그냥 패스스루
    if (this.retuneAmount < 0.001) {
      for (let i = 0; i < N; i++) {
        outCh[i] = inCh[i];
      }
      return true;
    }

    // 피치 감지 업데이트
    this.updatePitchDetection(inCh);

    const ratio = this.currentRatio || 1.0;

    // ===== 블록 내 resampling 기반 pitch shift =====
    for (let i = 0; i < N; i++) {
      const srcPos = i / ratio;

      if (srcPos >= N - 1) {
        outCh[i] = inCh[N - 1];
        continue;
      }

      const i0 = Math.floor(srcPos);
      const i1 = i0 + 1;
      const frac = srcPos - i0;

      const s0 = inCh[i0];
      const s1 = inCh[i1];

      outCh[i] = s0 + (s1 - s0) * frac;
    }

    return true;
  }
}

registerProcessor("auto-tune-processor", AutoTuneProcessor);
