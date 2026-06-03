import { useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { MatchCard } from "@/components/MatchCard";
import { useMatches, usePredictions } from "@/store/queries";
import { useAuth } from "@/store/auth";
import { isLocked } from "@/lib/format";

type Filter = "todos" | "abiertos" | "jugados";

export function Matches() {
  const { profile } = useAuth();
  const matches = useMatches();
  const predictions = usePredictions();
  const [filter, setFilter] = useState<Filter>("abiertos");

  const myPreds = useMemo(() => {
    const map = new Map<string, (typeof predictions.data)[number]>();
    (predictions.data ?? [])
      .filter((p) => p.user_id === profile?.id)
      .forEach((p) => map.set(p.match_id, p));
    return map;
  }, [predictions.data, profile?.id]);

  const list = useMemo(() => {
    const all = matches.data ?? [];
    if (filter === "abiertos")
      return all.filter((m) => m.status !== "finished" && !isLocked(m.kickoff_at));
    if (filter === "jugados") return all.filter((m) => m.status === "finished");
    return all;
  }, [matches.data, filter]);

  return (
    <>
      <AppHeader title="Partidos" subtitle="Cargá tu marcador antes del pitazo inicial" />
      <div className="px-4 py-4">
        <div className="flex gap-2 mb-4">
          {(["abiertos", "todos", "jugados"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold capitalize transition ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {matches.isLoading ? (
          <p className="text-center text-muted-foreground py-10">Cargando…</p>
        ) : list.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            {filter === "abiertos"
              ? "No hay partidos abiertos para pronosticar 🎯"
              : "Todavía no hay partidos cargados."}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {list.map((m) => (
              <MatchCard key={m.id} match={m} prediction={myPreds.get(m.id)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
