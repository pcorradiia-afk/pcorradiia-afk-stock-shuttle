import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PLAYERS, PlayerId, selectPlayer, useGameState } from "@/store/game";

export function Welcome() {
  const navigate = useNavigate();
  const game = useGameState();

  useEffect(() => {
    if (game.activePlayer) navigate("/", { replace: true });
  }, [game.activePlayer, navigate]);

  function choose(id: PlayerId) {
    selectPlayer(id);
    navigate("/");
  }

  return (
    <div className="min-h-screen safe-top safe-bottom bg-gradient-to-br from-sky-500 via-violet-600 to-fuchsia-600 text-white px-6 py-10 flex flex-col">
      <div className="text-center mb-8">
        <div className="text-6xl mb-2">⚽</div>
        <h1 className="text-3xl font-extrabold leading-tight">Mundial 2026</h1>
        <p className="text-lg font-semibold opacity-90">Mi Álbum de Figuritas</p>
        <p className="text-sm opacity-80 mt-2">Respondé trivia y ganá figuritas 🇦🇷</p>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-4 max-w-sm mx-auto w-full">
        <p className="text-center font-semibold mb-1">¿Quién va a jugar?</p>
        {(Object.values(PLAYERS) as (typeof PLAYERS)[PlayerId][]).map((p) => (
          <button
            key={p.id}
            onClick={() => choose(p.id)}
            className={`relative overflow-hidden rounded-3xl p-5 text-left bg-gradient-to-br ${p.color} shadow-xl active:scale-95 transition-transform border-4 border-white/30`}
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/25 backdrop-blur flex items-center justify-center text-4xl border-2 border-white/40">
                {p.emoji}
              </div>
              <div className="flex-1">
                <div className="text-2xl font-extrabold">{p.name}</div>
                <div className="text-sm opacity-90">{p.grade}</div>
              </div>
              <div className="text-2xl">▶</div>
            </div>
            <div className="shine absolute inset-0 pointer-events-none" />
          </button>
        ))}
      </div>

      <p className="text-center text-xs opacity-70 mt-6">
        Hecho con ❤️ para Dante y Otto
      </p>
    </div>
  );
}
