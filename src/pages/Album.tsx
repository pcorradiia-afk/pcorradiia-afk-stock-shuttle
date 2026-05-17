import { useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { TEAMS, Confederation } from "@/data/teams";
import { STICKERS_BY_TEAM, STICKERS_PER_TEAM } from "@/data/stickers";
import { useActivePlayer } from "@/store/game";
import { useNavigate } from "react-router-dom";

const CONFEDERATIONS: { id: Confederation | "ALL"; label: string }[] = [
  { id: "ALL", label: "Todos" },
  { id: "CONMEBOL", label: "Sudamérica" },
  { id: "UEFA", label: "Europa" },
  { id: "CONCACAF", label: "Norte/Centro" },
  { id: "CAF", label: "África" },
  { id: "AFC", label: "Asia" },
  { id: "OFC", label: "Oceanía" },
];

export function Album() {
  const active = useActivePlayer();
  const [filter, setFilter] = useState<Confederation | "ALL">("ALL");
  const navigate = useNavigate();

  const teams = useMemo(
    () => (filter === "ALL" ? TEAMS : TEAMS.filter((t) => t.confederation === filter)),
    [filter]
  );

  if (!active) return null;
  const owned = active.state.ownedCounts;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <AppHeader title="Mi Álbum" />
      <main className="max-w-md mx-auto px-4 pt-4">
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="flex gap-2 pb-3 w-max">
            {CONFEDERATIONS.map((c) => (
              <button
                key={c.id}
                onClick={() => setFilter(c.id)}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${
                  filter === c.id
                    ? "bg-primary text-white shadow"
                    : "bg-white text-slate-600 border border-slate-200"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <ul className="space-y-3">
          {teams.map((team) => {
            const stickers = STICKERS_BY_TEAM[team.code];
            const ownedCount = stickers.filter((s) => owned[s.id]).length;
            const complete = ownedCount === STICKERS_PER_TEAM;
            return (
              <li key={team.code}>
                <button
                  onClick={() => navigate(`/album/${team.code}`)}
                  className="w-full text-left rounded-2xl bg-white p-3 shadow-sm border border-slate-100 active:scale-[0.98] transition flex items-center gap-3"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: `${team.color}22` }}
                  >
                    {team.flag}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-extrabold truncate">{team.name}</div>
                      {complete && <span className="text-xs">✅</span>}
                    </div>
                    <div className="text-xs text-slate-500">{team.code} · {team.confederation}</div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(ownedCount / STICKERS_PER_TEAM) * 100}%`,
                          background: team.color,
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-sm">{ownedCount}<span className="text-slate-400 font-medium">/{STICKERS_PER_TEAM}</span></div>
                    <div className="text-[10px] text-slate-400">figuritas</div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
