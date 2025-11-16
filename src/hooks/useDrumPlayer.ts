import { useRef, useCallback } from "react";

export type DrumMap = { [key: string]: string };

export const useDrumPlayer = (mapping: DrumMap) => {
  const audioPool = useRef<{ [key: string]: HTMLAudioElement[] }>({});
  const POOL_SIZE = 8;

  const play = useCallback(
    (key: string) => {
      const src = mapping[key];
      if (!src) return;

      if (!audioPool.current[key]) {
        audioPool.current[key] = Array.from(
          { length: POOL_SIZE },
          () => new Audio(src)
        );
      }

      const pool = audioPool.current[key];
      const instance = pool.find((a) => a.paused) || pool[0];
      instance.currentTime = 0;
      instance.play();
    },
    [mapping]
  );

  return { play };
};
