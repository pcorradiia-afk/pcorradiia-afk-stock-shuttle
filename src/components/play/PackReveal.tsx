import { useState } from "react";
import { Sticker } from "@/data/stickers";
import { StickerCard } from "@/components/album/StickerCard";
import { useActivePlayer } from "@/store/game";
import { Confetti } from "@/components/Confetti";

interface Props {
  onOpen: () => Sticker[];
  onClose: () => void;
}

export function PackReveal({ onOpen, onClose }: Props) {
  const [opened, setOpened] = useState<Sticker[] | null>(null);
  const [revealedIdx, setRevealedIdx] = useState(-1);
  const [showConfetti, setShowConfetti] = useState(false);
  const active = useActivePlayer();

  function handleOpen() {
    const stickers = onOpen();
    setOpened(stickers);
    setShowConfetti(true);
    window.setTimeout(() => setShowConfetti(false), 2500);
    stickers.forEach((_, i) => {
      window.setTimeout(() => setRevealedIdx((c) => Math.max(c, i)), 350 * (i + 1));
    });
  }

  if (!opened) {
    return (
      <div className="flex flex-col items-center gap-6 py-8 animate-pop-in">
        <button
          onClick={handleOpen}
          className="relative w-44 h-60 rounded-3xl bg-gradient-to-br from-fuchsia-500 via-violet-600 to-indigo-600 shadow-2xl border-4 border-white active:scale-95 transition overflow-hidden"
        >
          <div className="absolute inset-0 shine" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <div className="text-5xl mb-2">📦</div>
            <div className="font-extrabold text-xl text-stroke">FIFA 2026</div>
            <div className="text-xs opacity-90 mt-1">¡Tocá para abrir!</div>
          </div>
        </button>
        <p className="text-center text-slate-600 font-semibold">
          🎉 ¡Te ganaste un sobre!
        </p>
      </div>
    );
  }

  const newOnesByThisOpening = opened.filter((s, i) => {
    if (i > revealedIdx) return false;
    // count how many were already owned before, excluding this draw
    const count = active?.state.ownedCounts[s.id] ?? 0;
    // we just added them, so count > 0; "new" means appears once (count == 1) AND wasn't there before
    // simpler: highlight first occurrence in the drawn list whose count == 1
    return count === 1 && opened.findIndex((x) => x.id === s.id) === i;
  });

  return (
    <div className="flex flex-col gap-4 animate-pop-in">
      {showConfetti && <Confetti />}
      <div className="text-center">
        <div className="text-2xl font-extrabold">¡Mirá lo que sacaste!</div>
        <div className="text-sm text-slate-500">
          {newOnesByThisOpening.length > 0
            ? `${newOnesByThisOpening.length} nuevas para el álbum 🎯`
            : "Repetidas... ¡suman para cambios!"}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 place-items-center">
        {opened.map((s, i) => (
          <div
            key={`${s.id}-${i}`}
            className={i <= revealedIdx ? "animate-flip-in" : "opacity-0"}
          >
            <StickerCard
              sticker={s}
              owned={i <= revealedIdx}
              count={(active?.state.ownedCounts[s.id] ?? 0)}
              isNew={newOnesByThisOpening.some((n) => n.id === s.id)}
              size="lg"
            />
          </div>
        ))}
      </div>
      {revealedIdx >= opened.length - 1 && (
        <button
          onClick={onClose}
          className="mt-2 mx-auto px-6 py-3 rounded-full bg-primary text-white font-bold shadow active:scale-95 transition"
        >
          ¡Listo!
        </button>
      )}
    </div>
  );
}
