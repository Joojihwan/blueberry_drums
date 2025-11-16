// src/pages/DrumTestPage.tsx
import "../styles/drum.scss";
import { useEffect, useState } from "react";
import { useDrumPlayer } from "../hooks/useDrumPlayer";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

const drumMapping = {
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

// 드럼 이름 타입
type DrumKey = keyof typeof drumMapping;

// 키보드 → 드럼 매핑 설정
type KeyConfig = {
  key: string;   // 실제 키 값 (e.key)
  label: string; // UI에 표시할 라벨
  drum: DrumKey;
};

// 대략 위치 맞춰서 배치:
// 위줄: 크래시 / 탐들
// 아래줄: 하이햇 / 스네어 / 라이드 / 플로어탐
// 가장 아래: 스페이스 = 킥
const keyConfigs: KeyConfig[] = [
  { key: "q", label: "Q", drum: "crash_left" },
  { key: "w", label: "W", drum: "small_tom" },
  { key: "e", label: "E", drum: "middle_tom" },
  { key: "r", label: "R", drum: "crash_right" },

  { key: "a", label: "A", drum: "hihat_closed" },
  { key: "s", label: "S", drum: "snare" },
  { key: "d", label: "D", drum: "floor_tom" },
  { key: "f", label: "F", drum: "ride" },

  { key: " ", label: "Space", drum: "kick" },
];

// key → drumName 맵 (keydown용)
const keyToDrum: Record<string, DrumKey> = keyConfigs.reduce(
  (acc, cfg) => {
    acc[cfg.key] = cfg.drum;
    return acc;
  },
  {} as Record<string, DrumKey>
);

// key → KeyConfig 맵 (UI 렌더용)
const keyConfigMap: Record<string, KeyConfig> = keyConfigs.reduce(
  (acc, cfg) => {
    acc[cfg.key] = cfg;
    return acc;
  },
  {} as Record<string, KeyConfig>
);

export default function DrumTestPage() {
  const { play } = useDrumPlayer(drumMapping);

  // 누르고 있는 키 (키보드 UI 하이라이트용)
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  // 활성화된 드럼 영역 (히트박스 하이라이트용)
  const [activeDrums, setActiveDrums] = useState<DrumKey[]>([]);

  const addActiveKey = (key: string) => {
    setActiveKeys((prev) =>
      prev.includes(key) ? prev : [...prev, key]
    );
  };

  const removeActiveKey = (key: string) => {
    setActiveKeys((prev) => prev.filter((k) => k !== key));
  };

  const addActiveDrum = (drum: DrumKey) => {
    setActiveDrums((prev) =>
      prev.includes(drum) ? prev : [...prev, drum]
    );
  };

  const removeActiveDrum = (drum: DrumKey) => {
    setActiveDrums((prev) => prev.filter((d) => d !== drum));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const raw = e.key === " " ? " " : e.key.toLowerCase();
      const drumKey = keyToDrum[raw];
      if (!drumKey) return;

      e.preventDefault(); // space 스크롤 방지
      play(drumKey);
      addActiveKey(raw);
      addActiveDrum(drumKey);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const raw = e.key === " " ? " " : e.key.toLowerCase();
      const drumKey = keyToDrum[raw];
      if (!drumKey) return;

      removeActiveKey(raw);
      removeActiveDrum(drumKey);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [play]);

  // 키 UI 렌더 함수
  const renderKey = (key: string) => {
    const cfg = keyConfigMap[key];
    if (!cfg) {
      return (
        <div className="keycap empty" key={key} aria-hidden="true" />
      );
    }

    const isActive = activeKeys.includes(key);

    return (
      <button
        key={key}
        type="button"
        className={`keycap ${key === " " ? "space" : ""} ${
          isActive ? "active" : ""
        }`}
        onMouseDown={(e) => {
          e.preventDefault();
          play(cfg.drum);
          addActiveKey(key);
          addActiveDrum(cfg.drum);
        }}
        onMouseUp={(e) => {
          e.preventDefault();
          removeActiveKey(key);
          removeActiveDrum(cfg.drum);
        }}
        onMouseLeave={() => {
          removeActiveKey(key);
          removeActiveDrum(cfg.drum);
        }}
      >
        <span className="key-label">{cfg.label}</span>
        <span className="key-drum">
          {cfg.drum.replace(/_/g, " ")}
        </span>
      </button>
    );
  };

  return (
    <div className="w-full flex justify-center mt-6">
      <div className="drum-container">
        <img src={`${base}/drums.png`} className="drum-image" />

        {/* 실제 드럼 이미지 위의 히트박스들 (마우스/터치용) */}
        {Object.keys(drumMapping).map((key) => {
          const drumKey = key as DrumKey;
          const isActive = activeDrums.includes(drumKey);

          return (
            <button
              key={key}
              className={`hit-area ${key} ${
                isActive ? "active" : ""
              } ${DEBUG ? "debug" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                play(drumKey);
                addActiveDrum(drumKey);
              }}
              onMouseUp={(e) => {
                e.preventDefault();
                removeActiveDrum(drumKey);
              }}
              onMouseLeave={() => {
                removeActiveDrum(drumKey);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                play(drumKey);
                addActiveDrum(drumKey);
              }}
              onTouchEnd={() => {
                removeActiveDrum(drumKey);
              }}
              onTouchCancel={() => {
                removeActiveDrum(drumKey);
              }}
            />
          );
        })}
      </div>
      
      {/* 드럼 아래 키보드 UI */}
      <div className="drum-keyboard">
        <div className="key-row">
          {["q", "w", "e", "r"].map(renderKey)}
        </div>
        <div className="key-row">
          {["a", "s", "d", "f"].map(renderKey)}
        </div>
        <div className="key-row space-row">
          {renderKey(" ")}
        </div>
      </div>
    </div>
  );
}
