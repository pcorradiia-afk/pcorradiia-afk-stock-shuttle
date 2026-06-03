// supabase/functions/sync-results/index.ts
// ----------------------------------------------------------------------------
// Trae los resultados FINALIZADOS del Mundial desde football-data.org y los
// escribe en la tabla `matches`, emparejando por el PAR de equipos (no depende
// de la hora). Pensada para correr por cron cada ~15 min y también a mano desde
// el panel de admin ("Sincronizar ahora").
//
// Deploy:
//   supabase functions deploy sync-results --no-verify-jwt
//
// Secretos necesarios (Supabase → Edge Functions → Secrets):
//   FOOTBALL_API_KEY        -> tu clave de football-data.org (gratis)
//   FOOTBALL_COMPETITION    -> opcional, default "WC" (FIFA World Cup)
// (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase solo.)
// ----------------------------------------------------------------------------

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Mapa de nombres de la API -> códigos de nuestra base ---------------------
// Claves normalizadas (minúsculas, sin tildes ni símbolos).
const NAME_TO_CODE: Record<string, string> = {
  mexico: "MEX",
  "korea republic": "KOR", "south korea": "KOR", korea: "KOR",
  "south africa": "RSA",
  czechia: "CZE", "czech republic": "CZE",
  canada: "CAN",
  switzerland: "SUI",
  qatar: "QAT",
  "bosnia and herzegovina": "BIH", "bosnia herzegovina": "BIH",
  brazil: "BRA",
  morocco: "MAR",
  scotland: "SCO",
  haiti: "HAI",
  "united states": "USA", usa: "USA", "united states of america": "USA",
  australia: "AUS",
  paraguay: "PAR",
  turkey: "TUR", turkiye: "TUR",
  germany: "GER",
  ecuador: "ECU",
  "cote divoire": "CIV", "ivory coast": "CIV",
  curacao: "CUW",
  netherlands: "NED", holland: "NED",
  japan: "JPN",
  tunisia: "TUN",
  sweden: "SWE",
  belgium: "BEL",
  iran: "IRN", "ir iran": "IRN",
  egypt: "EGY",
  "new zealand": "NZL",
  spain: "ESP",
  uruguay: "URU",
  "saudi arabia": "KSA",
  "cape verde": "CPV", "cabo verde": "CPV",
  france: "FRA",
  senegal: "SEN",
  norway: "NOR",
  iraq: "IRQ",
  argentina: "ARG",
  austria: "AUT",
  algeria: "ALG",
  jordan: "JOR",
  portugal: "POR",
  colombia: "COL",
  uzbekistan: "UZB",
  "dr congo": "COD", "congo dr": "COD",
  "democratic republic of congo": "COD",
  "democratic republic of the congo": "COD",
  england: "ENG",
  croatia: "CRO",
  panama: "PAN",
  ghana: "GHA",
};

function normalize(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const ALL_CODES = new Set(Object.values(NAME_TO_CODE));

/** Resuelve el código nuestro a partir del objeto team de la API. */
function resolveCode(team: { name?: string; shortName?: string; tla?: string }): string | null {
  // 1) TLA directo (football-data suele traer el código FIFA de 3 letras).
  const tla = (team?.tla || "").toUpperCase();
  if (ALL_CODES.has(tla)) return tla;
  // 2) Por nombre / nombre corto.
  for (const candidate of [team?.name, team?.shortName]) {
    if (!candidate) continue;
    const code = NAME_TO_CODE[normalize(candidate)];
    if (code) return code;
  }
  return null;
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey = Deno.env.get("FOOTBALL_API_KEY");
  const competition = Deno.env.get("FOOTBALL_COMPETITION") || "WC";

  const db = createClient(supabaseUrl, serviceKey);

  const finish = async (info: string, status = 200, extra: Record<string, unknown> = {}) => {
    await db
      .from("settings")
      .update({ last_sync_at: new Date().toISOString(), last_sync_info: info })
      .eq("id", 1);
    return new Response(JSON.stringify({ info, ...extra }), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  };

  if (!apiKey) {
    return finish("Falta el secreto FOOTBALL_API_KEY", 400);
  }

  // Respeta el toggle de auto-sync (salvo que se fuerce: ?force=1 o body {force:true}).
  let force = new URL(req.url).searchParams.get("force") === "1";
  if (!force && req.method === "POST") {
    try {
      const body = await req.json();
      if (body && body.force === true) force = true;
    } catch {
      // body vacío o no-JSON: lo ignoramos
    }
  }
  const { data: settings } = await db.from("settings").select("auto_sync_enabled").eq("id", 1).single();
  if (!force && settings && settings.auto_sync_enabled === false) {
    return finish("Auto-sync desactivado", 200, { updated: 0 });
  }

  // 1) Traer partidos finalizados de la API.
  let apiMatches: any[] = [];
  try {
    const res = await fetch(
      `https://api.football-data.org/v4/competitions/${competition}/matches?status=FINISHED`,
      { headers: { "X-Auth-Token": apiKey } }
    );
    if (!res.ok) {
      return finish(`Error de la API (${res.status}). Revisá la API key o la competición.`, 502);
    }
    const json = await res.json();
    apiMatches = json.matches || [];
  } catch (e) {
    return finish(`No se pudo contactar la API: ${(e as Error).message}`, 502);
  }

  // 2) Nuestros partidos que todavía no están finalizados.
  const { data: ourMatches, error: matchErr } = await db
    .from("matches")
    .select("id, home_team, away_team, status")
    .neq("status", "finished");
  if (matchErr) return finish(`Error leyendo matches: ${matchErr.message}`, 500);

  // Índice por par de equipos (sin orden) -> nuestro partido.
  const pairKey = (a: string, b: string) => [a, b].sort().join("|");
  const byPair = new Map<string, { id: string; home_team: string; away_team: string }>();
  for (const m of ourMatches || []) byPair.set(pairKey(m.home_team, m.away_team), m);

  let updated = 0;
  let unmatched = 0;
  const unmatchedNames: string[] = [];

  for (const am of apiMatches) {
    const homeCode = resolveCode(am.homeTeam || {});
    const awayCode = resolveCode(am.awayTeam || {});
    const ftHome = am?.score?.fullTime?.home;
    const ftAway = am?.score?.fullTime?.away;
    if (homeCode == null || awayCode == null || ftHome == null || ftAway == null) {
      unmatched++;
      unmatchedNames.push(`${am?.homeTeam?.name ?? "?"} vs ${am?.awayTeam?.name ?? "?"}`);
      continue;
    }

    const ours = byPair.get(pairKey(homeCode, awayCode));
    if (!ours) continue; // todavía no existe ese partido en nuestra base

    // Orientar los goles según cómo está cargado el partido en nuestra base.
    const sameOrientation = ours.home_team === homeCode;
    const home_score = sameOrientation ? ftHome : ftAway;
    const away_score = sameOrientation ? ftAway : ftHome;

    const { error: updErr } = await db
      .from("matches")
      .update({ home_score, away_score, status: "finished" })
      .eq("id", ours.id);
    if (!updErr) {
      updated++;
      byPair.delete(pairKey(homeCode, awayCode)); // evita reprocesar
    }
  }

  const info = `OK · ${updated} actualizados · ${apiMatches.length} finalizados en la API` +
    (unmatched ? ` · ${unmatched} sin mapear` : "");
  return finish(info, 200, { updated, unmatched, unmatchedNames: unmatchedNames.slice(0, 10) });
});
