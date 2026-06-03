import { useMemo } from "react";
import { AppHeader } from "@/components/AppHeader";
import { FlagBadge } from "@/components/FlagBadge";
import { getTeam } from "@/data/teams";
import type { Match, MatchStage, Prediction } from "@/lib/db-types";
import { matchPoints } from "@/lib/scoring";
import { useMatches, usePredictions } from "@/store/queries";
import { useAuth } from "@/store/auth";

const ROUNDS: { stage: MatchStage; label: string }[] = [
  { stage: "r32", label: "Dieciseisavos" },
  { stage: "r16", label: "Octavos" },
  { stage: "qf", label: "Cuartos" },
  { stage: "sf", label: "Semifinal" },
  { stage: "final", label: "Final" },
];

function TeamRow({
  code,
  score,
  winner,
}: {
  code: string;
  score: number | null;
  winner: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 ${
        winner ? "font-extrabold" : "text-muted-foreground"
      }`}
    >
      <FlagBadge code={code} size={20} />
      <span className="flex-1 text-xs uppercase tracking-tight truncate">
        {getTeam(code)?.name ?? code}
      </span>
      <span className="text-sm tabular-nums w-5 text-right">
        {score ?? ""}
      </span>
    </div>
  );
}

function BracketCard({ match, pred }: { match: Match; pred?: Prediction }) {
  const finished = match.status === "finished";
  const hw = finished && (match.home_score ?? 0) > (match.away_score ?? 0);
  const aw = finished && (match.away_score ?? 0) > (match.home_score ?? 0);
  const pts = pred ? matchPoints(pred, match) : 0;
  return (
    <div className="rounded-lg border border-border bg-card p-2.5 w-52 shrink-0 shadow-sm">
      <TeamRow code={match.home_team} score={match.home_score} winner={hw || !finished} />
      <div className="my-1 border-t border-dashed" />
      <TeamRow code={match.away_team} score={match.away_score} winner={aw || !finished} />
      {pred && (
        <div className="mt-1.5 pt-1.5 border-t flex items-center justify-between text-[10px] text-muted-foreground">
          <span>tu: {pred.home_score}-{pred.away_score}</span>
          {finished && (
            <span
              className={`font-bold ${pts > 0 ? "text-emerald-600" : ""}`}
            >
              {pts > 0 ? `+${pts}` : "0"} pts
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function Bracket() {
  const { profile } = useAuth();
  const matches = useMatches();
  const predictions = usePredictions();

  const myPred = useMemo(() => {
    const m = new Map<string, Prediction>();
    (predictions.data ?? [])
      .filter((p) => p.user_id === profile?.id)
      .forEach((p) => m.set(p.match_id, p));
    return m;
  }, [predictions.data, profile?.id]);

  const byStage = useMemo(() => {
    const m = new Map<MatchStage, Match[]>();
    (matches.data ?? []).forEach((mt) => {
      const arr = m.get(mt.stage) ?? [];
      arr.push(mt);
      m.set(mt.stage, arr);
    });
    return m;
  }, [matches.data]);

  const columns = ROUNDS.filter((r) => (byStage.get(r.stage) ?? []).length > 0);
  const third = byStage.get("third") ?? [];
  const hasAny = columns.length > 0 || third.length > 0;

  return (
    <>
      <AppHeader title="Llaves" subtitle="El camino a la copa 🏆" />
      <div className="px-4 py-4">
        {!hasAny ? (
          <div className="text-center text-muted-foreground py-16">
            <div className="text-5xl mb-2">🗺️</div>
            Las llaves se arman cuando termine la fase de grupos.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto pb-3 -mx-4 px-4">
              <div className="flex gap-4 min-w-max">
                {columns.map((r) => (
                  <div key={r.stage} className="flex flex-col gap-3">
                    <h3 className="font-display text-sm font-extrabold uppercase tracking-wide text-primary">
                      {r.label}
                    </h3>
                    {(byStage.get(r.stage) ?? []).map((mt) => (
                      <BracketCard key={mt.id} match={mt} pred={myPred.get(mt.id)} />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {third.length > 0 && (
              <div className="mt-6">
                <h3 className="font-display text-sm font-extrabold uppercase tracking-wide text-muted-foreground mb-2">
                  Tercer puesto
                </h3>
                <div className="flex gap-3">
                  {third.map((mt) => (
                    <BracketCard key={mt.id} match={mt} pred={myPred.get(mt.id)} />
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-4">
              💡 Deslizá para ver todas las rondas. Cargás tus pronósticos de estos
              partidos desde <b>Partidos</b>.
            </p>
          </>
        )}
      </div>
    </>
  );
}
