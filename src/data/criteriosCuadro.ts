import { useSyncExternalStore } from "react";
import { pushConfig } from "./configSync";

// Parametrización del cuadro de gestión:
//  1) criterio de prorrateo de los gastos comunes de Unidades (515) entre
//     0km / usados / planes — como hace el EEFF del grupo, y
//  2) ajustes extracontables manuales (prorrateos de compras anuales, etc.)
//     que afectan el cuadro de gestión pero no el balance.

// ---------- Criterio de prorrateo ----------

export interface CriterioProrrateo {
  /** "ventas": proporcional a las ventas del mes · "manual": porcentajes fijos. */
  modo: "ventas" | "manual";
  /** Porcentajes manuales (deben sumar 100). */
  pct: { "0km": number; usados: number; planes: number };
}

export const CRITERIO_DEFECTO: CriterioProrrateo = {
  modo: "ventas",
  pct: { "0km": 70, usados: 20, planes: 10 },
};

const KEY_CRIT = "fiorasi.cuadro.prorrateo.v1";
const EVENTO = "fiorasi:cuadro";

function leerCriterio(): CriterioProrrateo {
  try {
    const raw = localStorage.getItem(KEY_CRIT);
    if (!raw) return CRITERIO_DEFECTO;
    const c = JSON.parse(raw) as CriterioProrrateo;
    return c.modo ? c : CRITERIO_DEFECTO;
  } catch {
    return CRITERIO_DEFECTO;
  }
}

export function guardarCriterio(c: CriterioProrrateo) {
  localStorage.setItem(KEY_CRIT, JSON.stringify(c));
  window.dispatchEvent(new Event(EVENTO));
  pushConfig(KEY_CRIT);
}

// ---------- Ajustes extracontables ----------

export type LineaCuadro = "gvar" | "gfijo" | "otros" | "estructura";

export const LINEAS_CUADRO: { key: LineaCuadro; label: string }[] = [
  { key: "gvar", label: "Gastos variables" },
  { key: "gfijo", label: "Gastos fijos asignados" },
  { key: "otros", label: "Otros ing./egr. x depto." },
  { key: "estructura", label: "Gastos de estructura" },
];

export interface AjusteExtra {
  id: string;
  /** 'YYYY-MM' al que impacta. */
  periodo: string;
  /** Depto del cuadro ("0km"|"usados"|"planes"|"repuestos"|"posventa"|"admin"). */
  depto: string;
  linea: LineaCuadro;
  concepto: string;
  /** Impacto en el resultado: negativo = más gasto, positivo = recupero. */
  monto: number;
  empresaId: string;
}

const KEY_AJ = "fiorasi.cuadro.ajustes.v1";

function leerAjustes(): AjusteExtra[] {
  try {
    const raw = localStorage.getItem(KEY_AJ);
    return raw ? (JSON.parse(raw) as AjusteExtra[]) : [];
  } catch {
    return [];
  }
}

export function agregarAjuste(a: Omit<AjusteExtra, "id">) {
  const lista = leerAjustes();
  lista.push({ ...a, id: crypto.randomUUID() });
  localStorage.setItem(KEY_AJ, JSON.stringify(lista));
  window.dispatchEvent(new Event(EVENTO));
  pushConfig(KEY_AJ);
}

export function borrarAjuste(id: string) {
  localStorage.setItem(KEY_AJ, JSON.stringify(leerAjustes().filter((a) => a.id !== id)));
  window.dispatchEvent(new Event(EVENTO));
  pushConfig(KEY_AJ);
}

// ---------- Hooks reactivos ----------

function suscribir(cb: () => void) {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
}

let cacheC: { raw: string; val: CriterioProrrateo } | null = null;
function snapC(): CriterioProrrateo {
  const val = leerCriterio();
  const raw = JSON.stringify(val);
  if (cacheC && cacheC.raw === raw) return cacheC.val;
  cacheC = { raw, val };
  return val;
}

let cacheA: { raw: string; val: AjusteExtra[] } | null = null;
function snapA(): AjusteExtra[] {
  const val = leerAjustes();
  const raw = JSON.stringify(val);
  if (cacheA && cacheA.raw === raw) return cacheA.val;
  cacheA = { raw, val };
  return val;
}

export function useCriterioProrrateo(): CriterioProrrateo {
  return useSyncExternalStore(suscribir, snapC, () => CRITERIO_DEFECTO);
}

export function useAjustesExtra(): AjusteExtra[] {
  return useSyncExternalStore(suscribir, snapA, () => []);
}
