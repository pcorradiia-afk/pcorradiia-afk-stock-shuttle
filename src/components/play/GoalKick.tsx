import { useState } from "react";
import { CATEGORIES, CATEGORY_META, Category } from "@/data/trivia";

// Force a 3x3 grid with acertijos in the center for visual prominence.
const GRID: Category[] = [
  "matematica",
  "geografia",
  "lengua",
  "historia",
  "acertijos", // center = figurita difícil
  "ciencias",
  "deporte",
  "cultura",
  "ingles",
];

// Sanity: ensure we still cover all categories
if (GRID.length !== 9 || !CATEGORIES.every((c) => GRID.includes(c))) {
  // eslint-disable-next-line no-console
  console.warn("GoalKick GRID is out of sync with CATEGORIES");
}

interface Props {
  onPicked: (cat: Category) => void;
}

// Goal & ball geometry (px, mobile-friendly)
const W = 320;
const GOAL_H = 220;
const BALL_HOME_X = W / 2;
const BALL_HOME_Y = 320;

export function GoalKick({ onPicked }: Props) {
  const [phase, setPhase] = useState<"idle" | "shooting" | "scored">("idle");
  const [targetIdx, setTargetIdx] = useState<number | null>(null);

  function shoot() {
    if (phase !== "idle") return;
    const idx = Math.floor(Math.random() * GRID.length);
    setTargetIdx(idx);
    setPhase("shooting");
    window.setTimeout(() => setPhase("scored"), 1100);
    window.setTimeout(() => onPicked(GRID[idx]), 1900);
  }

  const COLS = 3;
  const ROWS = 3;
  const cellW = W / COLS;
  const cellH = GOAL_H / ROWS;
  const sectorCenter = (idx: number) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    return {
      x: col * cellW + cellW / 2,
      y: 40 + row * cellH + cellH / 2 - 22,
    };
  };

  const dx = targetIdx !== null ? sectorCenter(targetIdx).x - BALL_HOME_X : 0;
  const dy = targetIdx !== null ? sectorCenter(targetIdx).y - BALL_HOME_Y : 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative bg-gradient-to-b from-sky-300 to-emerald-400 rounded-3xl overflow-hidden shadow-inner border-4 border-white"
        style={{ width: W, height: 380 }}
      >
        {/* Field stripes */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: 200,
            background:
              "repeating-linear-gradient(0deg, #16a34a 0, #16a34a 18px, #15803d 18px, #15803d 36px)",
          }}
        />
        {/* Penalty arc */}
        <div
          className="absolute border-2 border-white/80 rounded-full"
          style={{
            width: 220,
            height: 90,
            left: (W - 220) / 2,
            top: 260,
          }}
        />
        <div className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white" style={{ top: 295 }} />

        {/* Goal frame */}
        <div className="absolute" style={{ top: 28, left: 0, width: W, height: GOAL_H + 12 }}>
          {/* posts/crossbar */}
          <div className="absolute inset-0 rounded-md border-[6px] border-white shadow-md bg-transparent" />
          {/* net */}
          <div
            className="absolute inset-[6px] opacity-70"
            style={{
              background:
                "repeating-linear-gradient(45deg, transparent 0 9px, rgba(255,255,255,0.45) 9px 10px), repeating-linear-gradient(-45deg, transparent 0 9px, rgba(255,255,255,0.45) 9px 10px)",
            }}
          />
          {/* sectors */}
          <div
            className="absolute inset-[6px] grid"
            style={{
              gridTemplateColumns: `repeat(${COLS}, 1fr)`,
              gridTemplateRows: `repeat(${ROWS}, 1fr)`,
            }}
          >
            {GRID.map((c, idx) => {
              const meta = CATEGORY_META[c];
              const isTarget = targetIdx === idx && phase !== "idle";
              const isRiddle = c === "acertijos";
              return (
                <div
                  key={c}
                  className={`relative flex flex-col items-center justify-center text-white text-stroke font-extrabold text-[10px] transition-all ${
                    isTarget && phase === "scored" ? "scale-110" : ""
                  } ${isRiddle ? "ring-2 ring-yellow-300/80" : ""}`}
                  style={{
                    background:
                      isTarget && phase === "scored"
                        ? `${meta.solid}cc`
                        : isRiddle
                        ? "rgba(234,179,8,0.18)"
                        : "transparent",
                  }}
                >
                  {isRiddle && (
                    <div className="absolute top-0.5 right-0.5 text-yellow-200 text-[10px]">★</div>
                  )}
                  <span className="text-xl drop-shadow leading-none">{meta.emoji}</span>
                  <span className="leading-tight mt-0.5 uppercase tracking-wide">
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ball */}
        <div
          className="absolute"
          style={{
            left: BALL_HOME_X - 22,
            top: BALL_HOME_Y - 22,
            transition: phase === "shooting" ? "transform 1.1s cubic-bezier(0.22, 0.7, 0.3, 1)" : "none",
            transform:
              phase === "idle"
                ? "translate(0,0) scale(1)"
                : `translate(${dx}px, ${dy}px) scale(0.55) rotate(720deg)`,
          }}
        >
          <div
            className="w-11 h-11 rounded-full shadow-lg flex items-center justify-center text-xl"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, #fff 0 35%, #e5e7eb 36% 60%, #9ca3af 100%)",
              boxShadow: "inset -4px -6px 8px rgba(0,0,0,0.25), 0 6px 10px rgba(0,0,0,0.25)",
            }}
          >
            ⚽
          </div>
        </div>

        {/* GOAL banner */}
        {phase === "scored" && targetIdx !== null && (
          <div className="absolute inset-x-0 top-2 text-center animate-pop-in pointer-events-none">
            <div className="inline-block px-4 py-1 rounded-full bg-yellow-400 text-black font-extrabold shadow text-sm">
              {GRID[targetIdx] === "acertijos" ? "🧩 ¡FIGURITA DIFÍCIL!" : "¡GOOOL!"}
              {" "}
              {CATEGORY_META[GRID[targetIdx]].emoji} {CATEGORY_META[GRID[targetIdx]].label}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={shoot}
        disabled={phase !== "idle"}
        className="px-10 py-4 rounded-full bg-gradient-to-br from-fuchsia-500 via-violet-500 to-indigo-500 text-white font-extrabold text-xl shadow-xl active:scale-95 transition disabled:opacity-60"
      >
        {phase === "idle" ? "¡PATEAR!" : phase === "shooting" ? "🚀" : "¡GOL!"}
      </button>
      <p className="text-xs text-slate-500 text-center max-w-[280px]">
        El centro del arco 🧩 es la <b>figurita difícil</b>: si la pegás y respondés bien, ¡ganás 3 figuritas!
      </p>
    </div>
  );
}
