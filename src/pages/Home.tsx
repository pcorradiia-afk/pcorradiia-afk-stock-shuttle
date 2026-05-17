import { useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { useActivePlayer } from "@/store/game";
import { ALL_STICKERS } from "@/data/stickers";
import { Sparkles, BookOpen, Package, Award } from "lucide-react";

export function Home() {
  const navigate = useNavigate();
  const active = useActivePlayer();
  if (!active) return null;

  const owned = Object.keys(active.state.ownedCounts).length;
  const total = ALL_STICKERS.length;
  const pct = Math.round((owned / total) * 100);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <AppHeader title="Mi Álbum" />

      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Progress card */}
        <section className="rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 text-white p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-xs opacity-80 uppercase tracking-wider">Mi Álbum</div>
              <div className="text-3xl font-extrabold">{owned}<span className="opacity-70 text-xl"> / {total}</span></div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-extrabold">{pct}%</div>
              <div className="text-xs opacity-80">completado</div>
            </div>
          </div>
          <div className="h-3 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-300 to-amber-400 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </section>

        {/* Big play CTA */}
        <button
          onClick={() => navigate("/jugar")}
          className="w-full rounded-3xl p-6 bg-gradient-to-br from-fuchsia-500 via-violet-500 to-indigo-500 text-white shadow-xl active:scale-95 transition-transform relative overflow-hidden"
        >
          <div className="absolute inset-0 shine pointer-events-none" />
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-9 h-9" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-2xl font-extrabold">¡A jugar!</div>
              <div className="text-sm opacity-90">Trivia → ganás figuritas</div>
            </div>
            <div className="text-3xl">⚽</div>
          </div>
        </button>

        {/* Tiles */}
        <div className="grid grid-cols-2 gap-3">
          <Tile
            onClick={() => navigate("/album")}
            Icon={BookOpen}
            label="Mi Álbum"
            sub="Ver figuritas"
            gradient="from-emerald-400 to-teal-500"
          />
          <Tile
            onClick={() => navigate("/jugar")}
            Icon={Package}
            label="Sobres"
            sub={active.state.unopenedPacks > 0 ? `${active.state.unopenedPacks} por abrir` : "Sin abrir"}
            gradient="from-amber-400 to-orange-500"
            badge={active.state.unopenedPacks > 0 ? String(active.state.unopenedPacks) : undefined}
          />
          <Tile
            onClick={() => navigate("/perfil")}
            Icon={Award}
            label="Logros"
            sub={`${active.state.totalCorrect} aciertos`}
            gradient="from-sky-400 to-indigo-500"
          />
          <Tile
            onClick={() => navigate("/album")}
            Icon={Sparkles}
            label="Cambios"
            sub="Repetidas"
            gradient="from-pink-400 to-rose-500"
          />
        </div>

        {/* Tip */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4 text-sm text-slate-700">
          <div className="font-bold text-slate-900 mb-1">💡 Tip</div>
          Si acertás <b>3 trivias seguidas</b>, ¡te regalamos un sobre con 4 figuritas!
        </div>
      </main>
    </div>
  );
}

function Tile({ onClick, Icon, label, sub, gradient, badge }: {
  onClick: () => void;
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub: string;
  gradient: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative rounded-2xl p-4 bg-gradient-to-br ${gradient} text-white text-left shadow-md active:scale-95 transition-transform`}
    >
      {badge && (
        <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-xs font-extrabold rounded-full min-w-[24px] h-6 flex items-center justify-center px-1.5 ring-2 ring-white">
          {badge}
        </span>
      )}
      <Icon className="w-7 h-7 mb-2 opacity-90" />
      <div className="font-extrabold leading-tight">{label}</div>
      <div className="text-xs opacity-90">{sub}</div>
    </button>
  );
}
