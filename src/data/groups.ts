// Fase de grupos oficial del Mundial 2026 (12 grupos de 4).
// Los códigos coinciden con src/data/teams.ts.

export const GROUPS: Record<string, [string, string, string, string]> = {
  A: ["MEX", "KOR", "RSA", "CZE"],
  B: ["CAN", "SUI", "QAT", "BIH"],
  C: ["BRA", "MAR", "SCO", "HAI"],
  D: ["USA", "AUS", "PAR", "TUR"],
  E: ["GER", "ECU", "CIV", "CUW"],
  F: ["NED", "JPN", "TUN", "SWE"],
  G: ["BEL", "IRN", "EGY", "NZL"],
  H: ["ESP", "URU", "KSA", "CPV"],
  I: ["FRA", "SEN", "NOR", "IRQ"],
  J: ["ARG", "AUT", "ALG", "JOR"],
  K: ["POR", "COL", "UZB", "COD"],
  L: ["ENG", "CRO", "PAN", "GHA"],
};

/** Todos los códigos de selecciones que juegan el Mundial. */
export const PARTICIPATING_CODES = Object.values(GROUPS).flat();

// Emparejamientos de un todos-contra-todos de 4 equipos (índices 0-3),
// agrupados por fecha (3 fechas, 2 partidos cada una).
const ROUNDS: [number, number][][] = [
  [
    [0, 1],
    [2, 3],
  ],
  [
    [0, 2],
    [3, 1],
  ],
  [
    [0, 3],
    [1, 2],
  ],
];

export interface SeedMatch {
  stage: "group";
  group_name: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  status: "scheduled";
}

/**
 * Genera los 72 partidos de la fase de grupos con horarios repartidos entre
 * el 11 y el ~28 de junio de 2026. El admin puede ajustar fecha/hora después.
 */
export function generateGroupMatches(): SeedMatch[] {
  const groupKeys = Object.keys(GROUPS);
  const out: SeedMatch[] = [];
  const HOURS = [13, 16, 19, 22];

  ROUNDS.forEach((round, matchday) => {
    groupKeys.forEach((key, g) => {
      const teams = GROUPS[key];
      round.forEach((pair, pairIdx) => {
        // Día: cada fecha dura ~6 días; los 12 grupos se reparten en esos días.
        const dayOffset = matchday * 6 + (g % 6);
        // Hora: grupos 0-5 juegan temprano, 6-11 más tarde.
        const hour = HOURS[(g < 6 ? 0 : 2) + pairIdx];
        const d = new Date(2026, 5, 11 + dayOffset, hour, 0, 0); // mes 5 = junio
        out.push({
          stage: "group",
          group_name: key,
          home_team: teams[pair[0]],
          away_team: teams[pair[1]],
          kickoff_at: d.toISOString(),
          status: "scheduled",
        });
      });
    });
  });

  return out;
}
