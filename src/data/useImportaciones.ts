import { useSyncExternalStore } from "react";
import {
  listarImportacionesLocal,
  suscribirImportaciones,
  type Importacion,
} from "./importsStore";

// Cache para que useSyncExternalStore reciba la misma referencia si nada cambió.
let cache: { key: string; lista: Importacion[] } | null = null;

function snapshot(empresaIds?: string[]): Importacion[] {
  const lista = listarImportacionesLocal(empresaIds);
  const key = lista.map((i) => i.id).join(",") + "|" + (empresaIds?.join(",") ?? "");
  if (cache && cache.key === key) return cache.lista;
  cache = { key, lista };
  return lista;
}

/** Lista reactiva de importaciones guardadas (filtrada por empresas visibles). */
export function useImportaciones(empresaIds?: string[]): Importacion[] {
  return useSyncExternalStore(
    suscribirImportaciones,
    () => snapshot(empresaIds),
    () => [],
  );
}
