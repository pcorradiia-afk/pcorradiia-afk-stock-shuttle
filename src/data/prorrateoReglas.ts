import { useSyncExternalStore } from "react";

// Reglas de prorrateo de los gastos comunes de Unidades (cuentas 515) hacia
// las líneas 0km / Usados / Planes. Cada subrubro (6 dígitos) tiene una regla;
// algunas cuentas van solo a 0km, otras a 0km+usados, otras a las tres.

export type ReglaProrrateo =
  | "solo_0km"
  | "solo_usados"
  | "ventas_0km_usados"
  | "ventas_0km_usados_planes";

export const REGLAS: { key: ReglaProrrateo; label: string; destinos: ("0km" | "usados" | "planes")[] }[] = [
  { key: "solo_0km", label: "Todo a 0km", destinos: ["0km"] },
  { key: "solo_usados", label: "Todo a Usados", destinos: ["usados"] },
  { key: "ventas_0km_usados", label: "% ventas 0km + Usados", destinos: ["0km", "usados"] },
  { key: "ventas_0km_usados_planes", label: "% ventas 0km + Usados + Planes", destinos: ["0km", "usados", "planes"] },
];

export const REGLA_DEFECTO: ReglaProrrateo = "ventas_0km_usados";

/** Heurística de regla inicial según el nombre del subrubro. */
export function reglaSugerida(nombre: string): ReglaProrrateo {
  const n = nombre.toLowerCase();
  if (/usad/.test(n)) return "solo_usados";
  if (/0km|0 km|preentrega|preparaci|demo|adjudic/.test(n)) return "solo_0km";
  return "ventas_0km_usados";
}

// clave del mapa = subrubro de 6 dígitos
export type MapaReglas = Record<string, ReglaProrrateo>;

const KEY = "fiorasi.prorrateo.reglas.v1";
const EVENTO = "fiorasi:prorrateoReglas";

function leer(): MapaReglas {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MapaReglas) : {};
  } catch {
    return {};
  }
}

export function guardarRegla(subrubro: string, regla: ReglaProrrateo) {
  const m = leer();
  m[subrubro] = regla;
  localStorage.setItem(KEY, JSON.stringify(m));
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

let cache: { raw: string; val: MapaReglas } | null = null;
function snapshot(): MapaReglas {
  const val = leer();
  const raw = JSON.stringify(val);
  if (cache && cache.raw === raw) return cache.val;
  cache = { raw, val };
  return val;
}

/** Mapa reactivo de reglas guardadas (subrubro → regla). */
export function useReglasProrrateo(): MapaReglas {
  return useSyncExternalStore(suscribir, snapshot, () => ({}));
}

/** Regla efectiva para un subrubro: la guardada, o la sugerida por su nombre. */
export function reglaDe(mapa: MapaReglas, subrubro: string, nombre: string): ReglaProrrateo {
  return mapa[subrubro] ?? reglaSugerida(nombre);
}
