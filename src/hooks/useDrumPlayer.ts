// src/hooks/useDrumPlayer.ts
import { useRef } from "react";

type DrumMap = {
  [key: string]: string; // key → audio file path
};

// 기본 매핑 (A = kick, S = snare, D = hihat)
const defaultMapping: DrumMap = {
  a: "/kick.wav",
  s: "/snare.wav",
  d: "/hihat.wav",
};

export const useDrumPlayer = (mapping: DrumMap = defaultMapping) => {
  // 각 키별로 여러 Audio 객체를 풀링해서 빠른 연타 대응
  const audioPool = useRef<{ [key: string]: HTMLAudioElement[] }>({});

  const getAudioInstance = (key: string) => {
    if (!mapping[key]) return null;

    if (!audioPool.current[key]) {
      audioPool.current[key] = [];
    }

    const pool = audioPool.current[key];

    // 재생 중이 아닌 Audio 찾기
    const idle = pool.find(a => a.paused);

    if (idle) {
      idle.currentTime = 0;
      return idle;
    }

    // 없으면 새 Audio 생성
    const newAudio = new Audio(mapping[key]);
    pool.push(newAudio);

    return newAudio;
  };

  const play = (key: string) => {
    const audio = getAudioInstance(key);
    if (!audio) return;
    audio.play();
  };

  return { play };
};
