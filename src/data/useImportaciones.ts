import { useEffect } from "react";
import { useSyncExternalStore } from "react";
import {
  listarImportacionesLocal,
  sincronizarDesdeNube,
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

/** Lista reactiva de importaciones guardadas (local + nube si está configurada). */
export function useImportaciones(empresaIds?: string[]): Importacion[] {
  const lista = useSyncExternalStore(
    suscribirImportaciones,
    () => snapshot(empresaIds),
    () => [],
  );

  // Al montar (o cambiar el filtro), traemos lo que haya en la nube.
  const dep = empresaIds?.join(",") ?? "";
  useEffect(() => {
    sincronizarDesdeNube(empresaIds).catch(() => {
      // Silencioso: si falla la nube, seguimos con lo local.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep]);

  return lista;
}
