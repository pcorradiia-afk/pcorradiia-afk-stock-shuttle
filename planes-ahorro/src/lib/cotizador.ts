"use client";

// Cotizador del adjudicado — lógica portada de la herramienta HTML del cliente
// ("Planilla Adjudicados Plan Óvalo", 07/07/2026), que a su vez digitaliza la
// planilla Excel de patentamiento/adjudicados. Ver CLAUDE.md §5.bis.7.
// Los datos (cartera resumida, modelos, precios, gestoría, requisitos) viven en
// src/data/cotizador-db.json y se refrescan reemplazando ese archivo (mensual).

import DB_JSON from "@/data/cotizador-db.json";

export interface CotizadorDB {
  act: Record<string, [number, number, string, number, string]>; // "grupo/orden" → [adelanto, licitadas, pct, emitidas, codPlan]
  mods: Record<string, [string, string, number, number, string]>; // codPlan → [pct, descModelo, precioLista, totCuotas, beneficio]
  reqTexts: string[];
  req: Record<string, number>; // `${pagas}${pct}${totCuotas}` → índice en reqTexts
  precio: Record<string, [number, number, string]>; // descModelo → [lista, promo, nota]
  prec2: Record<string, [string, number, number, string]>; // SEQ → [descModelo, precioActual, flete, origen]
  gest: Record<string, [number, number, number, number]>; // precio → [nqnNac, nqnImp, rnNac, rnImp]
  cancClient: number;
  visDesc: string[];
}

export const DB = DB_JSON as unknown as CotizadorDB;

/** Fecha de la actualización embebida en src/data/cotizador-db.json (se reemplaza mensualmente). */
export const FECHA_DATOS = "07/07/2026";

// --- Parámetros (mismos valores que la herramienta del cliente; editables acá) ---
export const PARAMS = {
  RATIOS_GESTORIA: { nqn: { NACIONAL: 0.0233, IMPORTADO: 0.0303 }, rn: { NACIONAL: 0.0295, IMPORTADO: 0.0365 } },
  EXTRAS_FIJOS: 450 + 4500,
  ADIC_GESTORIA: 5000,
  PRENDA_PCT: 0.028,
  SELLADO: { nqn: 0.014, rn: 0.02 },
  RECARGO_ALICUOTA: 1.0125, // 1,25% sobre la alícuota extraordinaria
  DERECHO_ADJ_PCT: 0.0121, // 1,21% del valor móvil (+ $1)
};

export type Provincia = "nqn" | "rn";

export interface PlanAdjudicado {
  key: string;
  codPlan: string;
  desc: string;
  pct: string;
  tipo: "100%" | "70/30" | "80/20";
  vm: number;
  pagas: number;
  aVencer: number;
  totCuotas: number;
  alicTotal: number;
  saldo: number;
  derecho: number;
  beneficio: string;
  reqTexto: string;
  licitadas: number;
  adelantadas: number;
}

function valorMovilDe(desc: string): number {
  const p = DB.precio[desc];
  if (p) {
    if (p[1] > 0) return p[1];
    if (p[0] > 0) return p[0];
  }
  return 0;
}

/** Busca el plan por grupo/orden en la actualización vigente. */
export function buscarPlan(grupo: string, orden: string): { ok: true; plan: PlanAdjudicado } | { ok: false; error: string } {
  const g = grupo.trim();
  const o = orden.trim().replace(/^0+(?=\d)/, "");
  if (!g || !o) return { ok: false, error: "Ingresá grupo y orden." };
  const key = `${g}/${o}`;
  const a = DB.act[key];
  if (!a) return { ok: false, error: `No se encontró el plan ${key} en la actualización vigente.` };
  const [adelanto, lic, pct, emi, codPlan] = a;
  const m = DB.mods[codPlan];
  if (!m) return { ok: false, error: `El plan ${key} tiene código "${codPlan}" que no figura en el catálogo de modelos.` };
  const [, desc, precioLista, totCuotas, beneficio] = m;
  const pagas = Math.round(emi + adelanto + lic);
  const aVencer = Math.max(0, totCuotas - pagas);
  const vm = valorMovilDe(desc) || precioLista;

  let alicTotal = 0;
  let tipo: PlanAdjudicado["tipo"] = "100%";
  if (pct === "70,00") { alicTotal = vm * 0.30 * PARAMS.RECARGO_ALICUOTA; tipo = "70/30"; }
  else if (pct === "80,00") { alicTotal = vm * 0.20 * PARAMS.RECARGO_ALICUOTA; tipo = "80/20"; }

  const saldo = ((vm - alicTotal) / totCuotas) * aVencer; // deuda estimada de cuotas a vencer
  const derecho = vm * PARAMS.DERECHO_ADJ_PCT + 1;
  const reqIdx = DB.req[`${pagas}${pct}${totCuotas}`];
  const reqTexto = reqIdx !== undefined
    ? DB.reqTexts[reqIdx]
    : "Consultar requisitos con administración (combinación de cuotas pagas y tipo de plan sin referencia cargada).";

  return {
    ok: true,
    plan: { key, codPlan, desc, pct, tipo, vm, pagas, aVencer, totCuotas, alicTotal, saldo, derecho, beneficio, reqTexto, licitadas: lic, adelantadas: adelanto },
  };
}

/** SEQ cuyo modelo coincide con el del plan (para precargar el primer slot). */
export function seqDelPlan(desc: string): string {
  for (const [seq, r] of Object.entries(DB.prec2)) {
    if (r[0].trim() === desc.trim()) return seq;
  }
  return "";
}

function gestoriaDe(precio: number, origen: string, prov: Provincia): number {
  const g = DB.gest[String(Math.round(precio))];
  const idx = prov === "nqn" ? (origen === "IMPORTADO" ? 1 : 0) : (origen === "IMPORTADO" ? 3 : 2);
  if (g && g[idx] > 0) return g[idx];
  const r = PARAMS.RATIOS_GESTORIA[prov][origen === "IMPORTADO" ? "IMPORTADO" : "NACIONAL"];
  return precio * r;
}

export interface OpcionesCotizacion {
  prov: Provincia;
  cancelado: boolean; // plan cancelado / patenta el cliente
  alicuotaPagada: boolean;
}

export interface Cotizacion {
  seq: string;
  desc: string;
  origen: string;
  nota: string;
  precioActual: number;
  promo: number | null;
  flete: number;
  difActual: number;
  difPromo: number | null;
  gestoria: number;
  inscripcion: number;
  sellado: number;
  prenda: number;
  gastosConc: number;
  alicPendiente: number;
  extraActual: number;
  extraPromo: number | null;
  totalConc: number;
  totalConcPromo: number | null;
  totalCli: number | null;
  totalCliPromo: number | null;
}

export function cotizarSeq(plan: PlanAdjudicado, seq: string, op: OpcionesCotizacion): Cotizacion | { error: string } | null {
  const s = seq.trim().toUpperCase();
  if (!s) return null;
  const r = DB.prec2[s];
  if (!r) return { error: `SEQ "${s}" no encontrado en la lista de precios.` };
  const [desc, precioActual, flete, origen] = r;
  const pInfo = DB.precio[desc] || [0, 0, ""];
  const promo = pInfo[1] > 0 ? pInfo[1] : null;
  const nota = pInfo[2] || "";
  const mismoModelo = desc.trim() === plan.desc.trim();
  const difActual = mismoModelo ? 0 : precioActual - plan.vm;
  const difPromo = mismoModelo ? 0 : promo != null ? promo - plan.vm : null;

  const gestoria = gestoriaDe(precioActual, origen, op.prov);
  const inscripcion = gestoria + PARAMS.ADIC_GESTORIA + PARAMS.EXTRAS_FIJOS;
  const sellado = precioActual * PARAMS.SELLADO[op.prov];
  const prenda = op.cancelado ? 0 : plan.saldo * PARAMS.PRENDA_PCT;
  const gastosConc = inscripcion + sellado + prenda;
  const alicPendiente = plan.alicTotal > 0 && !op.alicuotaPagada ? plan.alicTotal : 0;
  const extraActual = Math.max(0, alicPendiente + difActual);
  const extraPromo = difPromo != null ? Math.max(0, alicPendiente + difPromo) : null;
  const totalConc = gastosConc + flete + plan.derecho + extraActual;
  const totalConcPromo = extraPromo != null ? gastosConc + flete + plan.derecho + extraPromo : null;
  const totalCli = op.cancelado ? DB.cancClient + flete + plan.derecho + extraActual : null;
  const totalCliPromo = op.cancelado && extraPromo != null ? DB.cancClient + flete + plan.derecho + extraPromo : null;

  return { seq: s, desc, origen, nota, precioActual, promo, flete, difActual, difPromo, gestoria, inscripcion, sellado, prenda, gastosConc, alicPendiente, extraActual, extraPromo, totalConc, totalConcPromo, totalCli, totalCliPromo };
}
