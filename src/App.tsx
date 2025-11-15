// src/App.jsx
import { useState } from "react";

function App() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount((prev) => prev + 1);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        alignItems: "center",
        justifyContent: "center",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      }}
    >
      <h1>React + Vite 시작</h1>
      <p>여기서부터 컴포넌트/페이지를 쌓아가면 됩니다.</p>

      <button
        type="button"
        onClick={handleClick}
        style={{
          padding: "8px 16px",
          borderRadius: "999px",
          border: "1px solid #ddd",
          fontSize: "14px",
          cursor: "pointer",
        }}
      >
        클릭 횟수: {count}
      </button>
    </main>
  );
}

export default App;
