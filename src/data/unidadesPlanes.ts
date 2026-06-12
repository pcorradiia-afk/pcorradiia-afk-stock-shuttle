import { useSyncExternalStore } from "react";

// Unidades de Planes de Ahorro cargadas a mano (no salen del balance):
// suscripciones y entregas por empresa y mes. Local-first, igual que el resto.

export interface UnidadesPlanMes {
  /** Suscripciones del mes (altas de planes). */
  suscripciones: number;
  /** Entregas del mes (adjudicaciones/entregas de unidades por plan). */
  entregas: number;
}

/** clave = `${empresaId}|${periodo 'YYYY-MM'}` */
export type UnidadesPlanes = Record<string, UnidadesPlanMes>;

const KEY = "fiorasi.unidadesPlanes.v1";
const EVENTO = "fiorasi:unidadesPlanes";

function leer(): UnidadesPlanes {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as UnidadesPlanes) : {};
  } catch {
    return {};
  }
}

function clave(empresaId: string, periodo: string) {
  return `${empresaId}|${periodo}`;
}

/** Guarda (o borra si quedan en 0) las unidades de un mes para una empresa. */
export function guardarUnidadesPlan(
  empresaId: string,
  periodo: string,
  datos: UnidadesPlanMes,
) {
  const todo = leer();
  const k = clave(empresaId, periodo);
  if (!datos.suscripciones && !datos.entregas) delete todo[k];
  else todo[k] = { suscripciones: datos.suscripciones || 0, entregas: datos.entregas || 0 };
  localStorage.setItem(KEY, JSON.stringify(todo));
  window.dispatchEvent(new Event(EVENTO));
}

function suscribir(cb: () => void) {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
}

let cache: { raw: string; val: UnidadesPlanes } | null = null;
function snapshot(): UnidadesPlanes {
  const val = leer();
  const raw = JSON.stringify(val);
  if (cache && cache.raw === raw) return cache.val;
  cache = { raw, val };
  return val;
}

/** Mapa reactivo de unidades de planes cargadas a mano. */
export function useUnidadesPlanes(): UnidadesPlanes {
  return useSyncExternalStore(suscribir, snapshot, () => ({}));
}

/** Unidades de planes para una empresa/mes (0 si no se cargó). */
export function unidadesDe(
  mapa: UnidadesPlanes,
  empresaId: string,
  periodo: string,
): UnidadesPlanMes {
  return mapa[clave(empresaId, periodo)] ?? { suscripciones: 0, entregas: 0 };
}

/** Suma sobre varias empresas y/o varios meses (para vistas consolidadas/acumuladas). */
export function unidadesTotales(
  mapa: UnidadesPlanes,
  empresaIds: string[],
  periodos: string[],
): UnidadesPlanMes {
  let suscripciones = 0;
  let entregas = 0;
  for (const e of empresaIds) {
    for (const p of periodos) {
      const u = mapa[clave(e, p)];
      if (u) {
        suscripciones += u.suscripciones;
        entregas += u.entregas;
      }
    }
  }
  return { suscripciones, entregas };
}
