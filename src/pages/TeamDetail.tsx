import { useNavigate, useParams } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { getTeam } from "@/data/teams";
import { STICKERS_BY_TEAM } from "@/data/stickers";
import { useActivePlayer } from "@/store/game";
import { StickerCard } from "@/components/album/StickerCard";
import { ChevronLeft } from "lucide-react";

export function TeamDetail() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const active = useActivePlayer();
  if (!active || !code) return null;
  const team = getTeam(code);
  if (!team) return null;
  const stickers = STICKERS_BY_TEAM[code] ?? [];
  const owned = active.state.ownedCounts;
  const have = stickers.filter((s) => owned[s.id]).length;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <AppHeader title={team.name} />
      <main className="max-w-md mx-auto px-4 pt-4">
        <button
          onClick={() => navigate("/album")}
          className="inline-flex items-center gap-1 text-sm text-slate-600 font-semibold mb-3"
        >
          <ChevronLeft className="w-4 h-4" /> Volver al álbum
        </button>

        <div
          className="rounded-3xl p-5 text-white shadow-lg mb-4"
          style={{
            background: `linear-gradient(135deg, ${team.color}, ${team.color}cc)`,
          }}
        >
          <div className="flex items-center gap-3">
            <div className="text-5xl">{team.flag}</div>
            <div className="flex-1">
              <div className="text-xs uppercase opacity-80">{team.confederation}</div>
              <div className="text-2xl font-extrabold leading-tight">{team.name}</div>
              <div className="text-sm opacity-90">Capital: {team.capital}</div>
              <div className="text-sm opacity-90">Idioma: {team.language}</div>
            </div>
          </div>
          <div className="mt-3 text-sm bg-black/15 rounded-xl px-3 py-2">
            💡 {team.funFact}
          </div>
          <div className="mt-3 text-sm font-bold">
            Tenés {have} de {stickers.length} figuritas
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {stickers.map((s) => (
            <div key={s.id} className="flex justify-center">
              <StickerCard
                sticker={s}
                owned={!!owned[s.id]}
                count={owned[s.id] ?? 0}
                size="md"
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
