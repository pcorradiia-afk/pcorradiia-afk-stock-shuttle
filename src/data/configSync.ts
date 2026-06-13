import { getSupabase } from "@/lib/supabase";

// Sincroniza con la nube (tabla `config`) los parámetros y cargas manuales que
// hoy viven en localStorage, para que todo el equipo vea lo mismo desde
// cualquier dispositivo. Estrategia simple: una fila por clave, last-write-wins.
// Sin Supabase (o sin sesión) todo sigue funcionando solo-local.

interface DefConfig {
  /** Clave en la tabla config. */
  clave: string;
  /** Clave de localStorage donde vive el valor. */
  storageKey: string;
  /** Evento que dispara la actualización de los stores reactivos. */
  evento: string;
}

/** Registro de todo lo que se comparte. Agregar acá cualquier store nuevo. */
const REGISTRO: DefConfig[] = [
  { clave: "unidades_planes", storageKey: "fiorasi.unidadesPlanes.v1", evento: "fiorasi:unidadesPlanes" },
  { clave: "ajustes_extra", storageKey: "fiorasi.cuadro.ajustes.v1", evento: "fiorasi:cuadro" },
  { clave: "criterio_prorrateo", storageKey: "fiorasi.cuadro.prorrateo.v1", evento: "fiorasi:cuadro" },
  { clave: "prorrateo_reglas", storageKey: "fiorasi.prorrateo.reglas.v1", evento: "fiorasi:prorrateoReglas" },
  { clave: "aging_tramos", storageKey: "fiorasi.aging.tramos.v1", evento: "fiorasi:aging" },
  { clave: "clasificacion_cuentas", storageKey: "fiorasi.clasificacionCuentas.v1", evento: "fiorasi:clasificacionCuentas" },
];

const porStorageKey = new Map(REGISTRO.map((d) => [d.storageKey, d]));

/**
 * Sube a la nube el valor actual de un store local (se llama en cada guardado).
 * Best-effort: si no hay Supabase/sesión, no hace nada y no molesta.
 */
export function pushConfig(storageKey: string, autor?: string): void {
  const def = porStorageKey.get(storageKey);
  const sb = getSupabase();
  if (!def || !sb) return;
  const raw = localStorage.getItem(storageKey);
  if (raw === null) return;
  void sb
    .from("config")
    .upsert({
      clave: def.clave,
      valor: JSON.parse(raw),
      actualizado_por: autor ?? null,
      actualizado_el: new Date().toISOString(),
    })
    .then(({ error }) => {
      if (error) console.warn(`[configSync] no se pudo subir ${def.clave}:`, error.message);
    });
}

/**
 * Baja toda la configuración compartida y la aplica a los stores locales.
 * Se llama al iniciar sesión / restaurarla.
 */
export async function pullConfigs(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data, error } = await sb.from("config").select("clave, valor");
  if (error || !data) return;
  for (const row of data as { clave: string; valor: unknown }[]) {
    const def = REGISTRO.find((d) => d.clave === row.clave);
    if (!def || row.valor === null) continue;
    localStorage.setItem(def.storageKey, JSON.stringify(row.valor));
  }
  // Un solo refresco al final (los eventos pueden repetirse, no importa).
  for (const def of REGISTRO) window.dispatchEvent(new Event(def.evento));
}
