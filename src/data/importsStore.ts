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

/** Persiste una importación en Supabase. Devuelve la fila creada. */
export async function guardarImportacion(args: GuardarArgs): Promise<Importacion> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase no está configurado.");

  const calc =
    args.tipo === "balance_parcial"
      ? desdeBalance(args.aoa, args.headerRow)
      : args.tipo === "composicion"
        ? desdeComposicion(args.aoa, args.headerRow)
        : args.tipo === "balance_general"
          ? desdeBalanceGeneral(args.aoa, args.headerRow)
          : desdeMayor(args.aoa, args.headerRow);

  const fila = {
    empresa_id: args.empresaId,
    tipo: args.tipo,
    periodo: calc.periodo,
    corte: calc.corte,
    archivo: args.archivo,
    resumen: calc.resumen,
    payload: calc.payload,
    creado_por: args.creadoPor ?? null,
  };

  const { data, error } = await sb.from("importaciones").insert(fila).select().single();
  if (error) throw new Error(error.message);
  return data as Importacion;
}

/** Lista importaciones, opcionalmente filtradas por empresas visibles. */
export async function listarImportaciones(empresaIds?: string[]): Promise<Importacion[]> {
  const sb = getSupabase();
  if (!sb) return [];

  let query = sb.from("importaciones").select("*").order("creado_el", { ascending: false });
  if (empresaIds && empresaIds.length > 0) query = query.in("empresa_id", empresaIds);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Importacion[];
}

/** Elimina una importación por id. */
export async function borrarImportacion(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase no está configurado.");
  const { error } = await sb.from("importaciones").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export { isSupabaseConfigured };
