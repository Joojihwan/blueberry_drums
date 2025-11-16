import React from "react";
import "../styles/drum.scss";
import { useDrumPlayer } from "../hooks/useDrumPlayer";
import type { DrumMap } from "../hooks/useDrumPlayer";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

const drumMapping: DrumMap = {
  crash_left: `${base}/crash1.wav`,
  hihat_closed: `${base}/hihat.wav`,
  crash_right: `${base}/crash2.wav`,
  ride: `${base}/ride.wav`,
  small_tom: `${base}/small_tom.wav`,
  middle_tom: `${base}/middle_tom.wav`,
  snare: `${base}/snare.wav`,
  floor_tom: `${base}/floor_tom.wav`,
  kick: `${base}/kick.wav`,
};

const DEBUG = false;

export default function DrumTestPage() {
  const { play } = useDrumPlayer(drumMapping);

  return (
    <div className="w-full flex justify-center mt-6">
      <div className="drum-container">
        <img src={`${base}/drums.png`} className="drum-image" />

        {Object.keys(drumMapping).map((key) => (
          <button
            key={key}
            className={`hit-area ${key} ${DEBUG ? "debug" : ""}`}
            onClick={() => play(key)}
          />
        ))}
      </div>
    </div>
  );
}
