import { useMemo } from "react";

const COLORS = ["#0ea5e9", "#a855f7", "#f59e0b", "#ec4899", "#10b981", "#ef4444", "#facc15"];

export function Confetti({ count = 40 }: { count?: number }) {
  const pieces = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => ({
      key: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 1.8 + Math.random() * 1.4,
      color: COLORS[i % COLORS.length],
      rotate: Math.random() * 360,
    }));
  }, [count]);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-50">
      {pieces.map((p) => (
        <span
          key={p.key}
          className="confetti-piece rounded-sm"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
