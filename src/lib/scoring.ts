import { POINTS } from "@/data/rules";
import type {
  Asado,
  AsadoAttendee,
  Match,
  Prediction,
  Profile,
  Settings,
  SpecialPrediction,
} from "@/lib/db-types";

export type Outcome = "home" | "draw" | "away";

export function outcomeOf(home: number, away: number): Outcome {
  if (home > away) return "home";
  if (home < away) return "away";
  return "draw";
}

/** Puntos de un pronóstico de partido contra el resultado real. */
export function matchPoints(pred: Prediction, match: Match): number {
  if (
    match.status !== "finished" ||
    match.home_score == null ||
    match.away_score == null
  ) {
    return 0;
  }
  const exact =
    pred.home_score === match.home_score &&
    pred.away_score === match.away_score;
  if (exact) return POINTS.exact;
  const sameOutcome =
    outcomeOf(pred.home_score, pred.away_score) ===
    outcomeOf(match.home_score, match.away_score);
  return sameOutcome ? POINTS.outcome : 0;
}

/** Normaliza nombres de jugadores para comparar (sin tildes, minúsculas). */
export function normalizeName(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export interface ScoreBreakdown {
  matches: number;
  champion: number;
  bestPlayer: number;
  topScorer: number;
  asados: number;
  total: number;
}

export interface LeaderboardRow {
  profile: Profile;
  breakdown: ScoreBreakdown;
  prize: number;
}

interface ScoreInput {
  profiles: Profile[];
  matches: Match[];
  predictions: Prediction[];
  specials: SpecialPrediction[];
  settings: Settings | null;
  asados: Asado[];
  attendees: AsadoAttendee[];
}

/** Calcula el puntaje completo de cada jugador y arma la tabla. */
export function computeLeaderboard(input: ScoreInput): LeaderboardRow[] {
  const { profiles, matches, predictions, specials, settings, asados, attendees } =
    input;

  const matchById = new Map(matches.map((m) => [m.id, m]));
  const specialByUser = new Map(specials.map((s) => [s.user_id, s]));

  // Asados aprobados: +5 a cada comensal, +10 al anfitrión (la sede).
  const asadoPointsByUser = new Map<string, number>();
  const approvedAsadoIds = new Set(
    asados.filter((a) => a.approved).map((a) => a.id)
  );
  for (const att of attendees) {
    if (!approvedAsadoIds.has(att.asado_id)) continue;
    asadoPointsByUser.set(
      att.user_id,
      (asadoPointsByUser.get(att.user_id) ?? 0) + POINTS.asadoAttendee
    );
  }
  for (const a of asados) {
    if (!a.approved || !a.host_id) continue;
    asadoPointsByUser.set(
      a.host_id,
      (asadoPointsByUser.get(a.host_id) ?? 0) + POINTS.asadoHost
    );
  }

  const officialChampion = normalizeName(settings?.champion);
  const officialBest = normalizeName(settings?.best_player);
  const officialScorer = normalizeName(settings?.top_scorer);

  const predsByUser = new Map<string, Prediction[]>();
  for (const p of predictions) {
    const arr = predsByUser.get(p.user_id) ?? [];
    arr.push(p);
    predsByUser.set(p.user_id, arr);
  }

  const rows: LeaderboardRow[] = profiles.map((profile) => {
    const userPreds = predsByUser.get(profile.id) ?? [];
    let matchTotal = 0;
    for (const p of userPreds) {
      const m = matchById.get(p.match_id);
      if (m) matchTotal += matchPoints(p, m);
    }

    const sp = specialByUser.get(profile.id);
    const champion =
      officialChampion && normalizeName(sp?.champion) === officialChampion
        ? POINTS.champion
        : 0;
    const bestPlayer =
      officialBest && normalizeName(sp?.best_player) === officialBest
        ? POINTS.bestPlayer
        : 0;
    const topScorer =
      officialScorer && normalizeName(sp?.top_scorer) === officialScorer
        ? POINTS.topScorer
        : 0;

    const asadoTotal = asadoPointsByUser.get(profile.id) ?? 0;

    const total =
      matchTotal + champion + bestPlayer + topScorer + asadoTotal;

    return {
      profile,
      breakdown: {
        matches: matchTotal,
        champion,
        bestPlayer,
        topScorer,
        asados: asadoTotal,
        total,
      },
      prize: 0,
    };
  });

  rows.sort((a, b) => b.breakdown.total - a.breakdown.total);
  return rows;
}

/** Pozo total = monto de entrada * cantidad de jugadores que pagaron. */
export function computePot(profiles: Profile[], entryAmount: number): number {
  const payers = profiles.filter((p) => p.paid).length;
  return payers * entryAmount;
}
