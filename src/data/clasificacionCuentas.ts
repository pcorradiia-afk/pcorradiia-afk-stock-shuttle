import { useSyncExternalStore } from "react";
import type { LineaCuenta } from "@/lib/oliauto";
import { pushConfig } from "./configSync";

// Parametrización del estado de resultados a nivel cuenta: cada cuenta contable
// puede reasignarse a un departamento y/o a una línea del cuadro distinta de la
// que detecta el sistema por su código. Lo que no se toca, usa la automática.

export interface RepartoCuenta {
  /** "ventas": por % de ventas de cada depto en el mes · "fijo": % fijos. */
  modo: "ventas" | "fijo";
  /** Departamentos entre los que se reparte. */
  deptos: string[];
  /** % fijo por depto (clave = depto), solo en modo "fijo". Idealmente suman 100. */
  pct?: Record<string, number>;
}

export interface OverrideCuenta {
  depto?: string;
  linea?: LineaCuenta;
  /** Si está, la cuenta se reparte entre varios deptos (ignora `depto`). */
  reparto?: RepartoCuenta;
}

export type MapaClasificacion = Record<string, OverrideCuenta>;

/** Líneas del estado de resultados a las que puede ir una cuenta. */
export const LINEAS_EERR: { key: LineaCuenta; label: string }[] = [
  { key: "venta", label: "Ventas" },
  { key: "costo", label: "Costos" },
  { key: "gvar", label: "Gastos variables" },
  { key: "gfijo", label: "Gastos fijos" },
  { key: "otros", label: "Otros ing./egr." },
];

const KEY = "fiorasi.clasificacionCuentas.v1";
const EVENTO = "fiorasi:clasificacionCuentas";

function leer(): MapaClasificacion {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MapaClasificacion) : {};
  } catch {
    return {};
  }
}

/** Define (o limpia) el override de una cuenta. */
export function setClasificacion(codigo: string, ov: OverrideCuenta) {
  const m = leer();
  if (!ov.depto && !ov.linea && !ov.reparto) delete m[codigo];
  else m[codigo] = ov;
  localStorage.setItem(KEY, JSON.stringify(m));
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

let cache: { raw: string; val: MapaClasificacion } | null = null;
function snapshot(): MapaClasificacion {
  const val = leer();
  const raw = JSON.stringify(val);
  if (cache && cache.raw === raw) return cache.val;
  cache = { raw, val };
  return val;
}

export function useClasificacionCuentas(): MapaClasificacion {
  return useSyncExternalStore(suscribir, snapshot, () => ({}));
}
