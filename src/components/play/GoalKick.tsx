import { useState } from "react";
import { CATEGORY_META, Category } from "@/data/trivia";

const CATEGORIES: Category[] = ["geografia", "historia", "matematica", "ingles", "futbol"];

const COLORS: Record<Category, string> = {
  geografia: "#10b981",
  historia: "#f59e0b",
  matematica: "#0ea5e9",
  ingles: "#ec4899",
  futbol: "#a855f7",
};

interface Props {
  onPicked: (cat: Category) => void;
}

// Goal & ball geometry (px, mobile-friendly)
const W = 300;
const GOAL_H = 150;
const BALL_HOME_X = W / 2;
const BALL_HOME_Y = 280; // bottom area of canvas

export function GoalKick({ onPicked }: Props) {
  const [phase, setPhase] = useState<"idle" | "shooting" | "scored">("idle");
  const [targetIdx, setTargetIdx] = useState<number | null>(null);

  function shoot() {
    if (phase !== "idle") return;
    const idx = Math.floor(Math.random() * CATEGORIES.length);
    setTargetIdx(idx);
    setPhase("shooting");
    window.setTimeout(() => setPhase("scored"), 1100);
    window.setTimeout(() => onPicked(CATEGORIES[idx]), 1900);
  }

  // sector geometry
  const SECTOR_W = W / CATEGORIES.length;
  const sectorCenter = (idx: number) => ({
    x: idx * SECTOR_W + SECTOR_W / 2,
    y: 40 + GOAL_H / 2 - 18,
  });

  const dx = targetIdx !== null ? sectorCenter(targetIdx).x - BALL_HOME_X : 0;
  const dy = targetIdx !== null ? sectorCenter(targetIdx).y - BALL_HOME_Y : 0;

  return (
    <div className="flex flex-col items-center gap-5">
      <div
        className="relative bg-gradient-to-b from-sky-300 to-emerald-400 rounded-3xl overflow-hidden shadow-inner border-4 border-white"
        style={{ width: W, height: 340 }}
      >
        {/* Field stripes */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: 180,
            background:
              "repeating-linear-gradient(0deg, #16a34a 0, #16a34a 18px, #15803d 18px, #15803d 36px)",
          }}
        />
        {/* Penalty arc */}
        <div
          className="absolute border-2 border-white/80 rounded-full"
          style={{
            width: 200,
            height: 80,
            left: (W - 200) / 2,
            top: 200,
          }}
        />
        <div className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white" style={{ top: 235 }} />

        {/* Goal frame */}
        <div
          className="absolute"
          style={{ top: 28, left: 0, width: W, height: GOAL_H + 12 }}
        >
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
          <div className="absolute inset-[6px] grid" style={{ gridTemplateColumns: `repeat(${CATEGORIES.length}, 1fr)` }}>
            {CATEGORIES.map((c, idx) => {
              const isTarget = targetIdx === idx && phase !== "idle";
              return (
                <div
                  key={c}
                  className={`relative flex flex-col items-center justify-center text-white text-stroke font-extrabold text-xs transition ${
                    isTarget && phase === "scored" ? "scale-110" : ""
                  }`}
                  style={{
                    background: isTarget && phase === "scored" ? `${COLORS[c]}cc` : "transparent",
                  }}
                >
                  <span className="text-2xl drop-shadow">{CATEGORY_META[c].emoji}</span>
                  <span className="leading-tight mt-0.5 uppercase tracking-wide">
                    {CATEGORY_META[c].label}
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
            className="w-11 h-11 rounded-full shadow-lg"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, #fff 0 35%, #e5e7eb 36% 60%, #9ca3af 100%)",
              boxShadow: "inset -4px -6px 8px rgba(0,0,0,0.25), 0 6px 10px rgba(0,0,0,0.25)",
            }}
          >
            <div className="w-full h-full flex items-center justify-center text-xl">⚽</div>
          </div>
          {phase === "shooting" && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-2 rounded-full bg-black/30 blur" />
          )}
        </div>

        {/* GOAL banner */}
        {phase === "scored" && (
          <div className="absolute inset-x-0 top-2 text-center animate-pop-in pointer-events-none">
            <div className="inline-block px-4 py-1 rounded-full bg-yellow-400 text-black font-extrabold shadow text-sm">
              ¡GOOOL! {targetIdx !== null && CATEGORY_META[CATEGORIES[targetIdx]].emoji} {targetIdx !== null && CATEGORY_META[CATEGORIES[targetIdx]].label}
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
        Tirá al arco y donde caiga la pelota, ¡ahí va la pregunta!
      </p>
    </div>
  );
}
