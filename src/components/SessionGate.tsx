import { useNavigate } from "react-router-dom";
import { Hourglass } from "lucide-react";
import {
  formatClock,
  getSessionStatus,
  useActivePlayer,
  useLiveNow,
} from "@/store/game";

export function SessionGate({ children }: { children: React.ReactNode }) {
  const active = useActivePlayer();
  const navigate = useNavigate();
  useLiveNow(!!active && !!active.state.restingUntil);

  if (!active) return <>{children}</>;
  const status = getSessionStatus(active.state);
  if (status.kind !== "resting") return <>{children}</>;

  const left = status.restMsRemaining;
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-600 to-sky-700 text-white flex flex-col items-center justify-center text-center px-6 safe-top safe-bottom">
      <div className="text-7xl animate-bounce-soft mb-2">⏸️</div>
      <div className="text-3xl font-extrabold">MEDIO TIEMPO</div>
      <p className="text-base opacity-90 mt-2 max-w-xs">
        Los jugadores están descansando 💧<br />
        Volvé en un ratito y seguimos jugando.
      </p>

      <div className="mt-6 rounded-3xl bg-white/15 backdrop-blur border border-white/30 px-8 py-5">
        <div className="text-xs uppercase tracking-wider opacity-90">Vuelve en</div>
        <div className="text-5xl font-extrabold flex items-center justify-center gap-2">
          <Hourglass className="w-7 h-7" />
          {formatClock(left)}
        </div>
      </div>

      <p className="text-sm opacity-80 mt-6 max-w-xs">
        Mientras tanto podés <b>mirar tu álbum</b>, tomar agua 💧 o leer un rato 📚.
      </p>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => navigate("/album")}
          className="px-5 py-3 rounded-2xl bg-white text-emerald-700 font-extrabold shadow active:scale-95"
        >
          Ver mi álbum
        </button>
        <button
          onClick={() => navigate("/")}
          className="px-5 py-3 rounded-2xl bg-white/20 font-bold active:scale-95"
        >
          Ir a inicio
        </button>
      </div>
    </div>
  );
}
