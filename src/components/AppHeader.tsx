import {
  formatClock,
  getSessionStatus,
  SESSION_LIMIT_MS,
  useActivePlayer,
  useLiveNow,
} from "@/store/game";
import { ALL_STICKERS } from "@/data/stickers";
import { Hourglass, Package, Timer } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  title?: string;
  showStats?: boolean;
}

export function AppHeader({ title, showStats = true }: Props) {
  const active = useActivePlayer();
  const navigate = useNavigate();
  useLiveNow(!!active);
  if (!active) return null;

  const owned = Object.keys(active.state.ownedCounts).length;
  const total = ALL_STICKERS.length;
  const status = getSessionStatus(active.state);
  const isResting = status.kind === "resting";
  const lowTime = status.kind === "playing" && status.playMsRemaining <= 5 * 60 * 1000;

  return (
    <header className="safe-top sticky top-0 z-30 bg-gradient-to-br from-sky-500 via-violet-500 to-fuchsia-500 text-white shadow-md">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/perfil")}
          className={`w-11 h-11 rounded-full bg-gradient-to-br ${active.profile.color} flex items-center justify-center text-xl border-2 border-white shadow`}
          aria-label="Mi perfil"
        >
          {active.profile.emoji}
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wider opacity-80 leading-none">
            {title ?? "Mundial 2026"}
          </div>
          <div className="font-bold leading-tight truncate">¡Hola, {active.profile.name}!</div>
        </div>
        {showStats && (
          <div className="flex flex-col items-end gap-0.5">
            <div className="text-[10px] uppercase opacity-80 leading-none">Álbum</div>
            <div className="font-extrabold leading-none">
              {owned}<span className="opacity-70 font-medium text-xs">/{total}</span>
            </div>
          </div>
        )}
        {active.state.unopenedPacks > 0 && (
          <button
            onClick={() => navigate("/jugar")}
            className="relative ml-1 bg-white/20 hover:bg-white/30 rounded-xl p-2 transition"
            aria-label="Sobres por abrir"
          >
            <Package className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[10px] font-extrabold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {active.state.unopenedPacks}
            </span>
          </button>
        )}
      </div>

      {/* Match minute bar */}
      <div className="max-w-md mx-auto px-4 pb-2 -mt-1">
        {isResting ? (
          <div className="flex items-center justify-between gap-2 bg-white/15 rounded-full px-3 py-1 text-xs font-bold">
            <span className="flex items-center gap-1">
              <Hourglass className="w-3.5 h-3.5" />
              Medio tiempo · descansando
            </span>
            <span>{formatClock(status.restMsRemaining)}</span>
          </div>
        ) : (
          <div className={`flex items-center justify-between gap-2 rounded-full px-3 py-1 text-xs font-bold ${lowTime ? "bg-yellow-400/90 text-black" : "bg-white/15"}`}>
            <span className="flex items-center gap-1">
              <Timer className="w-3.5 h-3.5" />
              1er tiempo
            </span>
            <div className="flex-1 mx-2 h-1.5 rounded-full bg-black/15 overflow-hidden">
              <div
                className={`h-full rounded-full ${lowTime ? "bg-red-600" : "bg-white"}`}
                style={{ width: `${(status.elapsedMs / SESSION_LIMIT_MS) * 100}%` }}
              />
            </div>
            <span>{formatClock(status.playMsRemaining)}</span>
          </div>
        )}
      </div>
    </header>
  );
}
