import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ImportacionCalculada, TipoImportacion } from "../../src/lib/importCompute";
import type { Config } from "./config";

export function crearCliente(config: Config): SupabaseClient {
  // El robot usa la service_role key (servidor): puede escribir saltando RLS.
  return createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { persistSession: false },
  });
}

export interface FilaImportacion {
  empresa_id: string;
  tipo: TipoImportacion;
  archivo: string;
  calc: ImportacionCalculada;
}

/**
 * Inserta la importación reemplazando la anterior del mismo (empresa, tipo, período):
 * así cada corrida deja un único registro vigente por período, sin duplicar.
 */
export async function upsertImportacion(
  sb: SupabaseClient,
  fila: FilaImportacion,
): Promise<void> {
  const { empresa_id, tipo, archivo, calc } = fila;

  // Borra el registro previo equivalente (por período o por corte).
  let del = sb.from("importaciones").delete().eq("empresa_id", empresa_id).eq("tipo", tipo);
  del = calc.periodo ? del.eq("periodo", calc.periodo) : calc.corte ? del.eq("corte", calc.corte) : del;
  const { error: errDel } = await del;
  if (errDel) throw new Error(`Error al limpiar previo: ${errDel.message}`);

  const { error } = await sb.from("importaciones").insert({
    empresa_id,
    tipo,
    periodo: calc.periodo,
    corte: calc.corte,
    archivo,
    resumen: calc.resumen,
    payload: calc.payload,
    creado_por: "robot@oliauto",
  });
  if (error) throw new Error(`Error al insertar importación: ${error.message}`);
}
