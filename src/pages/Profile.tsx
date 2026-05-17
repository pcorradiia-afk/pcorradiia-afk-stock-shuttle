import { useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import {
  clearPlayer,
  gradeLabel,
  resetActivePlayer,
  setActivePlayerLevel,
  tradeDuplicatesForSticker,
  useActivePlayer,
} from "@/store/game";
import { ALL_STICKERS } from "@/data/stickers";
import { CATEGORY_META, Category, Level, LEVEL_META, LEVEL_ORDER } from "@/data/trivia";
import { useState } from "react";
import { StickerCard } from "@/components/album/StickerCard";
import { Sticker } from "@/data/stickers";
import { Confetti } from "@/components/Confetti";

export function Profile() {
  const active = useActivePlayer();
  const navigate = useNavigate();
  const [tradeResult, setTradeResult] = useState<Sticker | "no-dupes" | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  if (!active) return null;

  const owned = Object.keys(active.state.ownedCounts).length;
  const total = ALL_STICKERS.length;
  const duplicates = Object.values(active.state.ownedCounts).reduce(
    (sum, n) => sum + Math.max(0, n - 1),
    0
  );
  const accuracy =
    active.state.totalAsked === 0
      ? 0
      : Math.round((active.state.totalCorrect / active.state.totalAsked) * 100);

  function doTrade() {
    const r = tradeDuplicatesForSticker();
    if (!r) {
      setTradeResult("no-dupes");
      window.setTimeout(() => setTradeResult(null), 2000);
      return;
    }
    setTradeResult(r);
    setShowConfetti(true);
    window.setTimeout(() => setShowConfetti(false), 1800);
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <AppHeader title="Mi perfil" showStats={false} />
      {showConfetti && <Confetti />}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        <section
          className={`rounded-3xl bg-gradient-to-br ${active.profile.color} text-white p-5 shadow`}
        >
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-5xl border-2 border-white/40">
              {active.profile.emoji}
            </div>
            <div className="flex-1">
              <div className="text-2xl font-extrabold leading-tight">{active.profile.name}</div>
              <div className="text-sm opacity-90">{gradeLabel(active.state.level)}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <Stat label="Figuritas" value={`${owned}/${total}`} />
            <Stat label="Aciertos" value={String(active.state.totalCorrect)} />
            <Stat label="Mejor racha" value={`🔥 ${active.state.bestStreak}`} />
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
          <div className="font-extrabold mb-2">Mi grado</div>
          <p className="text-xs text-slate-500 mb-3">
            Las preguntas se adaptan a tu nivel. Si te resultan muy fáciles o muy difíciles,
            cambiá acá.
          </p>
          <div className="grid grid-cols-1 gap-2">
            {LEVEL_ORDER.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setActivePlayerLevel(lvl)}
                className={`w-full text-left px-3 py-2 rounded-xl border-2 font-bold transition ${
                  active.state.level === lvl
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-slate-200 text-slate-700 active:scale-[0.98]"
                }`}
              >
                <div className="text-sm">{LEVEL_META[lvl].label}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
          <div className="font-extrabold mb-3">Por categoría</div>
          <ul className="space-y-2">
            {(Object.keys(CATEGORY_META) as Category[]).map((cat) => {
              const s = active.state.byCategory[cat];
              const meta = CATEGORY_META[cat];
              const pct = s.asked > 0 ? Math.round((s.correct / s.asked) * 100) : 0;
              return (
                <li key={cat} className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br ${meta.color} text-white`}
                  >
                    {meta.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="font-bold">{meta.label}</div>
                      <div className="text-slate-500">
                        {s.correct}/{s.asked} ({pct}%)
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-1">
                      <div
                        className={`h-full bg-gradient-to-r ${meta.color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 text-xs text-slate-500">
            Total: {active.state.totalCorrect}/{active.state.totalAsked} preguntas ({accuracy}%)
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
          <div className="font-extrabold">Cambio de figuritas repetidas</div>
          <p className="text-sm text-slate-600 mt-1">
            Tenés <b>{duplicates}</b> figuritas repetidas. Cambialas: <b>5 repes = 1 nueva</b>.
          </p>
          <button
            onClick={doTrade}
            disabled={duplicates < 5}
            className="mt-3 w-full rounded-2xl py-3 bg-gradient-to-br from-pink-400 to-rose-500 text-white font-extrabold shadow active:scale-95 disabled:opacity-50"
          >
            Cambiar 5 repetidas por 1 nueva
          </button>
          {tradeResult === "no-dupes" && (
            <div className="mt-3 text-sm text-rose-600 font-bold">
              ¡Te faltan repetidas o ya completaste el álbum!
            </div>
          )}
          {tradeResult && tradeResult !== "no-dupes" && (
            <div className="mt-3 flex flex-col items-center animate-pop-in">
              <div className="text-sm text-emerald-600 font-bold mb-2">¡Ganaste una nueva!</div>
              <StickerCard sticker={tradeResult} owned size="lg" isNew />
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 space-y-2">
          <div className="font-extrabold">Cuenta</div>
          <button
            onClick={() => {
              clearPlayer();
              navigate("/bienvenida");
            }}
            className="w-full rounded-xl py-3 bg-slate-100 text-slate-700 font-bold active:scale-95"
          >
            Cambiar de jugador
          </button>
          <button
            onClick={() => {
              if (confirm("¿Borrar tu progreso? No se puede deshacer.")) {
                resetActivePlayer();
              }
            }}
            className="w-full rounded-xl py-3 bg-rose-50 text-rose-600 font-bold active:scale-95"
          >
            Borrar mi progreso
          </button>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/15 rounded-xl py-2">
      <div className="text-xs opacity-90">{label}</div>
      <div className="font-extrabold">{value}</div>
    </div>
  );
}
