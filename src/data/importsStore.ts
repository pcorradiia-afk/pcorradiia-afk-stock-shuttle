import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  parseBalanceGeneral,
  parseBalanceParcial,
  parseComposicionSaldos,
  parseMayor,
  type BalanceGeneral,
  type BalanceParcial,
  type Composicion,
  type Mayor,
} from "@/lib/oliauto";

export type TipoImportacion = "balance_parcial" | "composicion" | "balance_general" | "mayor";

export interface Importacion {
  id: string;
  empresa_id: string;
  tipo: TipoImportacion;
  periodo: string | null;
  corte: string | null;
  archivo: string;
  resumen: Record<string, unknown>;
  payload: BalanceParcial | Composicion | BalanceGeneral | Mayor;
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

/** Calcula el payload + resumen de un balance parcial para persistir. */
function desdeBalance(aoa: unknown[][], headerRow: number) {
  const payload = parseBalanceParcial(aoa, headerRow);
  const ultimo = payload.periodos[payload.periodos.length - 1] ?? null;
  const tot = ultimo ? payload.totales[ultimo] : undefined;
  return {
    periodo: ultimo,
    corte: null as string | null,
    payload,
    resumen: {
      periodo: ultimo,
      ingresos: tot?.ingresos ?? 0,
      resultado: tot?.resultado ?? 0,
      cuentas: payload.cuentasProcesadas,
      departamentos: Object.keys(payload.porDepto).length,
    },
  };
}

/** Calcula el payload + resumen de una composición de saldos para persistir. */
function desdeComposicion(aoa: unknown[][], headerRow: number) {
  const payload = parseComposicionSaldos(aoa, headerRow);
  return {
    periodo: payload.corte?.slice(0, 7) ?? null,
    corte: payload.corte ?? null,
    payload,
    resumen: {
      corte: payload.corte,
      totalDeudor: payload.totalDeudor,
      mas90: payload.buckets.mas90,
      clientesDeudores: payload.clientesDeudores,
    },
  };
}

/** Calcula el payload + resumen de un balance general para persistir. */
function desdeBalanceGeneral(aoa: unknown[][], headerRow: number) {
  const payload = parseBalanceGeneral(aoa, headerRow);
  return {
    periodo: null as string | null,
    corte: null as string | null,
    payload,
    resumen: {
      activo: payload.activo,
      pasivo: payload.pasivo,
      patrimonioNeto: payload.patrimonioNeto,
      resultado: payload.resultadoEjercicio,
      liquidez: payload.liquidezCorriente,
    },
  };
}

/** Calcula el payload + resumen de un libro mayor para persistir. */
function desdeMayor(aoa: unknown[][], headerRow: number) {
  const payload = parseMayor(aoa, headerRow);
  return {
    periodo: payload.fechaMax?.slice(0, 7) ?? null,
    corte: payload.fechaMax || null,
    payload,
    resumen: {
      movimientos: payload.movimientos,
      cuentas: payload.cuentas,
      totalDebe: payload.totalDebe,
      totalHaber: payload.totalHaber,
      sinComprobante: payload.sinComprobante,
    },
  };
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
  const calc =
    args.tipo === "balance_parcial"
      ? desdeBalance(args.aoa, args.headerRow)
      : args.tipo === "composicion"
        ? desdeComposicion(args.aoa, args.headerRow)
        : args.tipo === "balance_general"
          ? desdeBalanceGeneral(args.aoa, args.headerRow)
          : desdeMayor(args.aoa, args.headerRow);

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

