// src/pages/DrumTestPage.tsx
import { useEffect, useState } from "react";
import { useDrumPlayer } from "../hooks/useDrumPlayer";

export default function DrumTestPage() {
  const { play } = useDrumPlayer();
  const [lastKey, setLastKey] = useState("");

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      setLastKey(key);
      play(key);
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [play]);

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">🥁 Drum Test Page</h1>

      <p className="opacity-60 text-lg">
        A = Kick &nbsp;|&nbsp; S = Snare &nbsp;|&nbsp; D = Hihat
      </p>

      <div className="text-[120px] font-bold opacity-80">
        {lastKey.toUpperCase()}
      </div>

      <p className="opacity-50">키보드를 눌러보세요</p>
    </div>
  );
}
