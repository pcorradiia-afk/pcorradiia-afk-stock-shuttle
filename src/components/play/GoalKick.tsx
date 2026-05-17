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

if (GRID.length !== 9 || !CATEGORIES.every((c) => GRID.includes(c))) {
  console.warn("GoalKick GRID is out of sync with CATEGORIES");
}

interface Props {
  onPicked: (cat: Category) => void;
}

const W = 320;
const H = 400;
const GRID_TOP = 28;
const TILE = 88;
const GAP = 8;
const GRID_SIZE = TILE * 3 + GAP * 2;
const GRID_LEFT = (W - GRID_SIZE) / 2;
const BALL_SIZE = 44;
const BALL_HOME_X = W / 2 - BALL_SIZE / 2;
const BALL_HOME_Y = H - BALL_SIZE - 24;

type Phase = "idle" | "shooting" | "scored";

export function GoalKick({ onPicked }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [targetIdx, setTargetIdx] = useState<number | null>(null);

  function shoot() {
    if (phase !== "idle") return;
    const idx = Math.floor(Math.random() * GRID.length);
    setTargetIdx(idx);
    setPhase("shooting");
    window.setTimeout(() => setPhase("scored"), 1100);
    window.setTimeout(() => onPicked(GRID[idx]), 1900);
  }

  const tileCenter = (idx: number) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    return {
      x: GRID_LEFT + col * (TILE + GAP) + TILE / 2,
      y: GRID_TOP + row * (TILE + GAP) + TILE / 2,
    };
  };

  const target = targetIdx !== null ? tileCenter(targetIdx) : null;
  const dx = target ? target.x - (BALL_HOME_X + BALL_SIZE / 2) : 0;
  const dy = target ? target.y - (BALL_HOME_Y + BALL_SIZE / 2) : 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative rounded-[28px] overflow-hidden shadow-xl"
        style={{
          width: W,
          height: H,
          background:
            "radial-gradient(120% 80% at 50% 0%, #e0f2fe 0%, #f0fdf4 60%, #ecfccb 100%)",
        }}
      >
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(15,23,42,0.08) 1px, transparent 1.2px)",
            backgroundSize: "14px 14px",
          }}
        />
        {/* Soft horizon glow */}
        <div
          className="absolute inset-x-0 pointer-events-none"
          style={{
            top: GRID_TOP + GRID_SIZE - 14,
            height: 60,
            background:
              "linear-gradient(to bottom, rgba(16,185,129,0) 0%, rgba(16,185,129,0.18) 60%, rgba(16,185,129,0) 100%)",
          }}
        />

        {/* 3x3 target grid */}
        <div
          className="absolute"
          style={{
            top: GRID_TOP,
            left: GRID_LEFT,
            width: GRID_SIZE,
            height: GRID_SIZE,
            display: "grid",
            gridTemplateColumns: `repeat(3, ${TILE}px)`,
            gridTemplateRows: `repeat(3, ${TILE}px)`,
            gap: GAP,
          }}
        >
          {GRID.map((c, idx) => {
            const meta = CATEGORY_META[c];
            const isRiddle = c === "acertijos";
            const isTarget = targetIdx === idx && phase !== "idle";
            const lifted = isTarget && phase === "scored";
            return (
              <div
                key={c}
                className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${meta.color} text-white shadow-md flex flex-col items-center justify-center transition-all duration-300 ${
                  lifted ? "scale-110 ring-4 ring-yellow-300 animate-target-pulse z-20" : ""
                } ${isRiddle ? "ring-2 ring-yellow-300/90" : ""}`}
                style={{
                  boxShadow: lifted
                    ? "0 12px 28px rgba(0,0,0,0.28)"
                    : "0 4px 10px rgba(15,23,42,0.18)",
                }}
              >
                {/* Inner gloss */}
                <div
                  className="absolute inset-x-0 top-0 h-1/2 pointer-events-none rounded-t-2xl"
                  style={{
                    background:
                      "linear-gradient(to bottom, rgba(255,255,255,0.32), rgba(255,255,255,0))",
                  }}
                />
                {isRiddle && (
                  <div className="absolute top-1 right-1 text-yellow-100 text-sm drop-shadow">
                    ✨
                  </div>
                )}
                <span className="text-3xl leading-none drop-shadow-sm">{meta.emoji}</span>
                <span className="text-stroke font-extrabold text-[10px] uppercase tracking-wide mt-1 leading-tight">
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Penalty spot under the ball */}
        <div
          className="absolute rounded-full bg-white/70 border border-emerald-200"
          style={{
            left: BALL_HOME_X + BALL_SIZE / 2 - 28,
            top: BALL_HOME_Y + BALL_SIZE + 4,
            width: 56,
            height: 10,
            filter: "blur(1px)",
          }}
        />

        {/* Ball */}
        <div
          key={`ball-${targetIdx ?? "idle"}-${phase}`}
          className={phase === "shooting" || phase === "scored" ? "animate-ball-arc" : "animate-bounce-soft"}
          style={{
            position: "absolute",
            left: BALL_HOME_X,
            top: BALL_HOME_Y,
            width: BALL_SIZE,
            height: BALL_SIZE,
            ["--dx" as string]: `${dx}px`,
            ["--dy" as string]: `${dy}px`,
          }}
        >
          <div
            className="w-full h-full rounded-full flex items-center justify-center text-xl"
            style={{
              background:
                "radial-gradient(circle at 35% 28%, #ffffff 0 32%, #e5e7eb 33% 58%, #94a3b8 100%)",
              boxShadow:
                "inset -5px -7px 10px rgba(0,0,0,0.22), 0 8px 14px rgba(15,23,42,0.28)",
            }}
          >
            <span aria-hidden>⚽</span>
          </div>
        </div>

        {/* Goal banner */}
        {phase === "scored" && targetIdx !== null && (
          <div className="absolute inset-x-0 top-2 text-center animate-pop-in pointer-events-none z-30">
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-yellow-400 text-black font-extrabold shadow-lg text-sm">
              <span>
                {GRID[targetIdx] === "acertijos" ? "🧩 ¡DIFÍCIL!" : "¡GOOOL!"}
              </span>
              <span className="opacity-80">·</span>
              <span>{CATEGORY_META[GRID[targetIdx]].emoji} {CATEGORY_META[GRID[targetIdx]].label}</span>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={shoot}
        disabled={phase !== "idle"}
        className="px-10 py-4 rounded-full bg-gradient-to-br from-fuchsia-500 via-violet-500 to-indigo-500 text-white font-extrabold text-xl shadow-xl active:scale-95 transition disabled:opacity-60 inline-flex items-center gap-2"
      >
        <span aria-hidden>⚽</span>
        {phase === "idle" ? "¡PATEAR!" : phase === "shooting" ? "Volando…" : "¡GOL!"}
      </button>

      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold max-w-[300px] text-center">
        <span>✨</span>
        <span>El centro 🧩 es la <b>figurita difícil</b>: ¡vale 3!</span>
      </div>
    </div>
  );
}
