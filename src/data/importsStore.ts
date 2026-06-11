import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  computarImportacion,
  type PayloadImportacion,
  type TipoImportacion,
} from "@/lib/importCompute";

export type { TipoImportacion } from "@/lib/importCompute";

export interface Importacion {
  id: string;
  empresa_id: string;
  tipo: TipoImportacion;
  periodo: string | null;
  corte: string | null;
  archivo: string;
  resumen: Record<string, unknown>;
  payload: PayloadImportacion;
  creado_por: string | null;
  creado_el: string;
}

export interface GuardarArgs {
  empresaId: string;
  tipo: TipoImportacion;
  archivo: string;
  aoa: unknown[][];
  headerRow: number;
  creadoPor?: string;
}

// ---------------------------------------------------------------------------
// Almacenamiento local-first: guardamos siempre en el navegador y, si Supabase
// está configurado, sincronizamos a la nube. Así la persistencia funciona ya,
// sin esperar las credenciales.
// ---------------------------------------------------------------------------
const LOCAL_KEY = "fiorasi.importaciones.v1";
const EVENTO = "fiorasi:importaciones";

function leerLocal(): Importacion[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as Importacion[]) : [];
  } catch {
    return [];
  }
}

function escribirLocal(lista: Importacion[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(lista));
  window.dispatchEvent(new Event(EVENTO));
}

/** Suscribe a cambios en la lista local (alta/baja). Devuelve la función para desuscribir. */
export function suscribirImportaciones(cb: () => void): () => void {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Lee la lista local, opcionalmente filtrada por empresas, ordenada por fecha desc. */
export function listarImportacionesLocal(empresaIds?: string[]): Importacion[] {
  const lista = leerLocal();
  const filtrada = empresaIds && empresaIds.length > 0
    ? lista.filter((i) => empresaIds.includes(i.empresa_id))
    : lista;
  return [...filtrada].sort((a, b) => (a.creado_el < b.creado_el ? 1 : -1));
}

/**
 * Persiste una importación: siempre en el navegador y, si hay Supabase, también
 * en la nube. Devuelve la fila creada.
 */
export async function guardarImportacion(args: GuardarArgs): Promise<Importacion> {
  const calc = computarImportacion(args.tipo, args.aoa, args.headerRow);

  const fila: Importacion = {
    id: crypto.randomUUID(),
    empresa_id: args.empresaId,
    tipo: args.tipo,
    periodo: calc.periodo,
    corte: calc.corte,
    archivo: args.archivo,
    resumen: calc.resumen,
    payload: calc.payload,
    creado_por: args.creadoPor ?? null,
    creado_el: new Date().toISOString(),
  };

  // Local-first: guardamos primero en el navegador.
  escribirLocal([fila, ...leerLocal()]);

  // Sincronización con la nube (best-effort).
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from("importaciones").insert(fila);
    if (error) {
      throw new Error(`Guardado en este dispositivo, pero falló la sincronización con la nube: ${error.message}`);
    }
  }
  return fila;
}

/** Elimina una importación por id (local y, si corresponde, en la nube). */
export async function borrarImportacion(id: string): Promise<void> {
  escribirLocal(leerLocal().filter((i) => i.id !== id));
  const sb = getSupabase();
  if (sb) await sb.from("importaciones").delete().eq("id", id);
}

export { isSupabaseConfigured };

