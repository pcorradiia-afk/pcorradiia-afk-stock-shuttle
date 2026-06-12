import { useSyncExternalStore } from "react";
import { pushConfig } from "./configSync";
import { HISTO_MAX } from "@/lib/oliauto";

// Tramos de antigüedad parametrizables para el aging de cuentas corrientes.
// Cada número es el límite SUPERIOR (en días) de un tramo; el primero define
// el corte "corriente". El último tramo es "más de <último valor>".

export const TRAMOS_DEFECTO = [30, 60, 90, 120, 180, 365];

const KEY = "fiorasi.aging.tramos.v1";
const EVENTO = "fiorasi:aging";

function leer(): number[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return TRAMOS_DEFECTO;
    const arr = JSON.parse(raw) as number[];
    return Array.isArray(arr) && arr.length ? arr : TRAMOS_DEFECTO;
  } catch {
    return TRAMOS_DEFECTO;
  }
}

export function guardarTramos(tramos: number[]) {
  const limpio = Array.from(new Set(tramos.filter((n) => n > 0 && n <= HISTO_MAX))).sort((a, b) => a - b);
  localStorage.setItem(KEY, JSON.stringify(limpio.length ? limpio : TRAMOS_DEFECTO));
  window.dispatchEvent(new Event(EVENTO));
  pushConfig(KEY);
}

export function resetTramos() {
  localStorage.setItem(KEY, JSON.stringify(TRAMOS_DEFECTO));
  window.dispatchEvent(new Event(EVENTO));
  pushConfig(KEY);
}

function suscribir(cb: () => void) {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
}

let cache: { raw: string; val: number[] } | null = null;
function snapshot(): number[] {
  const val = leer();
  const raw = JSON.stringify(val);
  if (cache && cache.raw === raw) return cache.val;
  cache = { raw, val };
  return val;
}

/** Tramos de antigüedad configurados (reactivo). */
export function useTramos(): number[] {
  return useSyncExternalStore(suscribir, snapshot, () => TRAMOS_DEFECTO);
}

export interface TramoAging {
  label: string;
  desde: number;
  hasta: number | null; // null = sin tope (más de…)
  monto: number;
  color: string;
}

// Paleta verde → rojo (corriente a más vencido).
const PALETA = ["#16a34a", "#84cc16", "#eab308", "#f59e0b", "#f97316", "#ea580c", "#dc2626", "#b91c1c", "#7f1d1d"];

/** Reagrupa un histograma diario en los tramos dados. Índice 0 = corriente. */
export function bucketsDeHistograma(histograma: number[], tramos: number[]): TramoAging[] {
  const orden = Array.from(new Set(tramos.filter((n) => n > 0))).sort((a, b) => a - b);
  const cortes = [0, ...orden];
  const out: TramoAging[] = [];
  for (let i = 0; i < cortes.length; i++) {
    const desde = cortes[i];
    const hasta = i < cortes.length - 1 ? cortes[i + 1] : null;
    let monto = 0;
    const fin = hasta ?? histograma.length;
    for (let d = desde; d < fin; d++) monto += histograma[d] ?? 0;
    if (hasta === null) monto += histograma[histograma.length - 1] ?? 0; // por las dudas
    out.push({
      label: i === 0 ? `Corriente (≤${orden[0]} d)` : hasta === null ? `+${desde} días` : `${desde}–${hasta} días`,
      desde,
      hasta,
      monto,
      color: PALETA[Math.min(i, PALETA.length - 1)],
    });
  }
  return out;
}

/** Histograma de una composición; si es vieja (sin histograma), lo aproxima desde los buckets. */
export function histogramaDe(payload: {
  histograma?: number[];
  buckets?: { alDia: number; d30: number; d60: number; d90: number; mas90: number };
}): number[] {
  if (payload.histograma && payload.histograma.length) return payload.histograma;
  const h = new Array<number>(HISTO_MAX + 1).fill(0);
  const b = payload.buckets;
  if (b) {
    h[0] += b.alDia;
    h[20] += b.d30;
    h[45] += b.d60;
    h[75] += b.d90;
    h[150] += b.mas90; // aproximación para datos viejos
  }
  return h;
}

/** Suma elemento a elemento de varios histogramas. */
export function sumarHistogramas(lista: number[][]): number[] {
  const out = new Array<number>(HISTO_MAX + 1).fill(0);
  for (const h of lista) for (let i = 0; i < out.length && i < h.length; i++) out[i] += h[i];
  return out;
}
