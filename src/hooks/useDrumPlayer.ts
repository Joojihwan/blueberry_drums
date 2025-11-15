// src/hooks/useDrumPlayer.ts
import { useRef } from "react";

type DrumMap = {
  [key: string]: string; // key → audio file path
};

const base = import.meta.env.BASE_URL; // <- Vite가 알아서 / 또는 /repo-name/ 으로 채워줌

// 기본 매핑 (A = kick, S = snare, D = hihat)
const defaultMapping: DrumMap = {
  a: `${base}kick.wav`,
  s: `${base}snare.wav`,
  d: `${base}hihat.wav`,
};

export const useDrumPlayer = (mapping: DrumMap = defaultMapping) => {
  const audioPool = useRef<{ [key: string]: HTMLAudioElement[] }>({});

  const getAudioInstance = (key: string) => {
    if (!mapping[key]) return null;

    if (!audioPool.current[key]) {
      audioPool.current[key] = [];
    }

    const pool = audioPool.current[key];

    const idle = pool.find(a => a.paused);

    if (idle) {
      idle.currentTime = 0;
      return idle;
    }

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
