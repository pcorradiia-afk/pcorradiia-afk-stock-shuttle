import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock, Check } from "lucide-react";
import type { Match, MatchStage, Prediction } from "@/lib/db-types";
import { teamLabel } from "@/components/TeamSelect";
import { formatKickoff, isLocked } from "@/lib/format";
import { matchPoints } from "@/lib/scoring";
import { useUpsertPrediction } from "@/store/queries";
import { useAuth } from "@/store/auth";

const STAGE_LABEL: Record<MatchStage, string> = {
  group: "Fase de grupos",
  r32: "16avos",
  r16: "Octavos",
  qf: "Cuartos",
  sf: "Semifinal",
  third: "3er puesto",
  final: "FINAL",
};

function ScoreBox({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="number"
      min={0}
      max={30}
      inputMode="numeric"
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-12 h-12 text-center text-xl font-extrabold rounded-xl border border-input bg-background disabled:opacity-60"
    />
  );
}

export function MatchCard({
  match,
  prediction,
}: {
  match: Match;
  prediction?: Prediction;
}) {
  const { profile } = useAuth();
  const upsert = useUpsertPrediction();
  const locked = isLocked(match.kickoff_at);
  const finished = match.status === "finished";

  const [home, setHome] = useState(prediction ? String(prediction.home_score) : "");
  const [away, setAway] = useState(prediction ? String(prediction.away_score) : "");

  useEffect(() => {
    if (prediction) {
      setHome(String(prediction.home_score));
      setAway(String(prediction.away_score));
    }
  }, [prediction]);

  const dirty =
    home !== "" &&
    away !== "" &&
    (!prediction ||
      Number(home) !== prediction.home_score ||
      Number(away) !== prediction.away_score);

  async function save() {
    if (!profile) return;
    if (home === "" || away === "") {
      toast.error("Completá los dos marcadores");
      return;
    }
    try {
      await upsert.mutateAsync({
        user_id: profile.id,
        match_id: match.id,
        home_score: Number(home),
        away_score: Number(away),
      });
      toast.success("Pronóstico guardado");
    } catch (e) {
      toast.error("No se pudo guardar", {
        description:
          (e as Error).message ?? "Quizás el partido ya empezó (cierra al comenzar).",
      });
    }
  }

  const points = prediction ? matchPoints(prediction, match) : 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          {STAGE_LABEL[match.stage]}
          {match.group_name ? ` · Grupo ${match.group_name}` : ""}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {formatKickoff(match.kickoff_at)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="flex-1 text-right font-bold text-sm leading-tight">
          {teamLabel(match.home_team)}
        </span>

        {finished ? (
          <div className="flex items-center gap-1 font-extrabold text-lg">
            <span className="w-9 text-center">{match.home_score}</span>
            <span className="text-muted-foreground">-</span>
            <span className="w-9 text-center">{match.away_score}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <ScoreBox value={home} onChange={setHome} disabled={locked} />
            <span className="text-muted-foreground font-bold">-</span>
            <ScoreBox value={away} onChange={setAway} disabled={locked} />
          </div>
        )}

        <span className="flex-1 font-bold text-sm leading-tight">
          {teamLabel(match.away_team)}
        </span>
      </div>

      {/* Pie: estado / acción */}
      <div className="mt-2 flex items-center justify-between min-h-[28px]">
        <div className="text-xs text-muted-foreground">
          {prediction ? (
            <span className="flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              Tu pronóstico: {prediction.home_score}-{prediction.away_score}
            </span>
          ) : locked ? (
            <span className="flex items-center gap-1 text-amber-600">
              <Lock className="w-3.5 h-3.5" /> No pronosticaste
            </span>
          ) : (
            "Sin cargar"
          )}
        </div>

        {finished && prediction ? (
          <span
            className={`text-xs font-extrabold px-2 py-1 rounded-full ${
              points > 0
                ? "bg-emerald-100 text-emerald-700"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {points > 0 ? `+${points} pts` : "0 pts"}
          </span>
        ) : locked ? (
          <span className="text-xs flex items-center gap-1 text-muted-foreground">
            <Lock className="w-3.5 h-3.5" /> Cerrado
          </span>
        ) : (
          <button
            onClick={save}
            disabled={!dirty || upsert.isPending}
            className="text-xs font-bold px-3 py-1.5 rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          >
            {prediction ? "Actualizar" : "Guardar"}
          </button>
        )}
      </div>
    </div>
  );
}
