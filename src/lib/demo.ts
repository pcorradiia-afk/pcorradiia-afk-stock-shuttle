// Modo DEMO: datos de ejemplo para ver la app sin configurar Supabase.
// Se activa con la variable VITE_DEMO=1 o agregando ?demo a la URL.
import type {
  Asado,
  AsadoAttendee,
  Match,
  Prediction,
  Profile,
  Settings,
  SpecialPrediction,
} from "@/lib/db-types";

export const DEMO =
  import.meta.env.VITE_DEMO === "1" ||
  (typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("demo"));

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();

// --- Jugadores (el primero sos "vos") --------------------------------------
const NAMES = [
  "Vos (demo)", "Fer", "Colo", "Nacho", "Tincho", "Lucho", "Gordo",
  "Flaco", "Beto", "Cacho", "Pato", "Rulo", "Tano", "Negro",
];

export const demoProfiles: Profile[] = NAMES.map((name, i) => ({
  id: i === 0 ? "me" : `u${i}`,
  display_name: name,
  is_admin: i === 0,
  paid: i !== 11, // casi todos pagaron
  created_at: iso(now - 30 * DAY),
}));

export const DEMO_USER = demoProfiles[0];

// --- Partidos: fase de grupos + eliminatorias (con resultados) -------------
interface Seed {
  id: string; stage: Match["stage"]; g?: string; h: string; a: string;
  hs?: number; as?: number; inDays: number;
}
const SEEDS: Seed[] = [
  // Grupos jugados
  { id: "m1", stage: "group", g: "J", h: "ARG", a: "JOR", hs: 3, as: 1, inDays: -20 },
  { id: "m2", stage: "group", g: "C", h: "BRA", a: "HAI", hs: 2, as: 0, inDays: -20 },
  { id: "m3", stage: "group", g: "H", h: "ESP", a: "CPV", hs: 1, as: 1, inDays: -19 },
  { id: "m4", stage: "group", g: "I", h: "FRA", a: "IRQ", hs: 2, as: 1, inDays: -19 },
  { id: "m5", stage: "group", g: "L", h: "ENG", a: "PAN", hs: 0, as: 0, inDays: -18 },
  { id: "m6", stage: "group", g: "E", h: "GER", a: "CUW", hs: 4, as: 2, inDays: -18 },
  // Grupos por venir (para que se vean los inputs de pronóstico)
  { id: "m7", stage: "group", g: "J", h: "ARG", a: "ALG", inDays: 1 },
  { id: "m8", stage: "group", g: "C", h: "BRA", a: "SCO", inDays: 1 },
  { id: "m9", stage: "group", g: "H", h: "ESP", a: "URU", inDays: 2 },
  { id: "m10", stage: "group", g: "A", h: "MEX", a: "KOR", inDays: 2 },

  // Octavos (jugados)
  { id: "o1", stage: "r16", h: "ARG", a: "NED", hs: 2, as: 0, inDays: -12 },
  { id: "o2", stage: "r16", h: "ECU", a: "SEN", hs: 1, as: 0, inDays: -12 },
  { id: "o3", stage: "r16", h: "ENG", a: "SUI", hs: 3, as: 0, inDays: -11 },
  { id: "o4", stage: "r16", h: "FRA", a: "MAR", hs: 2, as: 1, inDays: -11 },
  { id: "o5", stage: "r16", h: "BRA", a: "KOR", hs: 4, as: 1, inDays: -10 },
  { id: "o6", stage: "r16", h: "POR", a: "CRO", hs: 2, as: 1, inDays: -10 },
  { id: "o7", stage: "r16", h: "ESP", a: "JPN", hs: 2, as: 0, inDays: -9 },
  { id: "o8", stage: "r16", h: "GER", a: "BEL", hs: 1, as: 0, inDays: -9 },
  // Cuartos (jugados)
  { id: "c1", stage: "qf", h: "ARG", a: "ECU", hs: 2, as: 1, inDays: -6 },
  { id: "c2", stage: "qf", h: "ENG", a: "FRA", hs: 2, as: 1, inDays: -6 },
  { id: "c3", stage: "qf", h: "BRA", a: "POR", hs: 3, as: 1, inDays: -5 },
  { id: "c4", stage: "qf", h: "ESP", a: "GER", hs: 1, as: 0, inDays: -5 },
  // Semis (jugadas)
  { id: "s1", stage: "sf", h: "ARG", a: "ENG", hs: 1, as: 0, inDays: -2 },
  { id: "s2", stage: "sf", h: "BRA", a: "ESP", hs: 2, as: 1, inDays: -2 },
  // Final y 3er puesto (por venir)
  { id: "t1", stage: "third", h: "ENG", a: "ESP", inDays: 2 },
  { id: "f1", stage: "final", h: "ARG", a: "BRA", inDays: 3 },
];

export const demoMatches: Match[] = SEEDS.map((s) => ({
  id: s.id,
  stage: s.stage,
  group_name: s.g ?? null,
  home_team: s.h,
  away_team: s.a,
  kickoff_at: iso(now + s.inDays * DAY),
  home_score: s.hs ?? null,
  away_score: s.as ?? null,
  status: s.hs != null ? "finished" : "scheduled",
  created_at: iso(now - 25 * DAY),
}));

// Pronóstico de un usuario para un partido jugado (genera variedad de puntos).
function predFor(u: number, mi: number, ah: number, aa: number): [number, number] {
  const r = (u * 7 + mi * 3) % 5;
  const oc = Math.sign(ah - aa);
  if (r === 0) return [ah, aa]; // exacto (6)
  if (r === 1 || r === 2) {
    // mismo resultado, distinto marcador (4)
    if (oc > 0) return [ah + 1, aa];
    if (oc < 0) return [ah, aa + 1];
    return [ah + 1, aa + 1];
  }
  // errado (0)
  if (oc > 0) return [aa, ah + 1];
  if (oc < 0) return [ah + 1, aa];
  return [2, 0];
}

const finished = SEEDS.filter((s) => s.hs != null);
export const demoPredictions: Prediction[] = [];
finished.forEach((s, mi) => {
  demoProfiles.forEach((p, u) => {
    const [hs, as] = predFor(u, mi, s.hs!, s.as!);
    demoPredictions.push({
      id: `${s.id}-${p.id}`,
      user_id: p.id,
      match_id: s.id,
      home_score: hs,
      away_score: as,
      updated_at: iso(now - 6 * DAY),
    });
  });
});
// "Vos" ya cargaste algunos de los próximos partidos
[["m7", 2, 0], ["m9", 1, 1], ["m10", 1, 0]].forEach(([id, h, a]) => {
  demoPredictions.push({
    id: `${id}-me`, user_id: "me", match_id: id as string,
    home_score: h as number, away_score: a as number, updated_at: iso(now),
  });
});

// --- Pronósticos Plus -------------------------------------------------------
const CHAMPS = ["ARG", "BRA", "FRA", "ESP", "ENG", "POR"];
export const demoSpecials: SpecialPrediction[] = demoProfiles.map((p, i) => ({
  user_id: p.id,
  champion: CHAMPS[i % CHAMPS.length],
  best_player: i === 0 ? "Lionel Messi" : "Kylian Mbappé",
  top_scorer: i === 0 ? "Julián Álvarez" : "Harry Kane",
  updated_at: iso(now - 10 * DAY),
}));

// --- Asados -----------------------------------------------------------------
export const demoAsados: Asado[] = [
  {
    id: "a1", title: "Asado pre-Mundial 🥩", date: iso(now - 7 * DAY).slice(0, 10),
    host_id: "u2", approved: true, created_by: "u2", created_at: iso(now - 8 * DAY),
  },
  {
    id: "a2", title: "Asado del debut de Argentina", date: iso(now + 1 * DAY).slice(0, 10),
    host_id: "me", approved: false, created_by: "me", created_at: iso(now - 1 * DAY),
  },
];
export const demoAttendees: AsadoAttendee[] = [
  { asado_id: "a1", user_id: "me" },
  { asado_id: "a1", user_id: "u1" },
  { asado_id: "a1", user_id: "u2" },
  { asado_id: "a1", user_id: "u3" },
  { asado_id: "a1", user_id: "u4" },
  { asado_id: "a2", user_id: "me" },
  { asado_id: "a2", user_id: "u5" },
];

// --- Configuración / pozo ---------------------------------------------------
export const demoSettings: Settings = {
  id: 1,
  champion: null, // el Mundial está en curso
  best_player: null,
  top_scorer: null,
  entry_amount: 20000,
  currency: "ARS",
  predictions_locked: false,
  specials_deadline: iso(now + 1 * DAY),
  auto_sync_enabled: true,
  last_sync_at: iso(now - 2 * 60 * 60 * 1000),
  last_sync_info: "OK · 6 actualizados · 6 finalizados en la API",
};
