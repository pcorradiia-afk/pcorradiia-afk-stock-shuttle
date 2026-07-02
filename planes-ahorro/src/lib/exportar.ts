"use client";

// Exportación de listados a Excel (CLAUDE.md §7). Usa SheetJS igual que la importación.

import * as XLSX from "xlsx";

/**
 * Descarga un .xlsx con las filas dadas. `filas` es una lista de objetos cuyas
 * claves son los encabezados de columna (en español, tal como se quieren ver).
 */
export function exportarExcel(filas: Record<string, string | number | null>[], nombreArchivo: string, nombreHoja = "Datos") {
  const ws = XLSX.utils.json_to_sheet(filas);
  // Ancho de columnas razonable según el contenido.
  const headers = filas.length ? Object.keys(filas[0]) : [];
  ws["!cols"] = headers.map((h) => ({
    wch: Math.min(40, Math.max(h.length, ...filas.map((f) => String(f[h] ?? "").length)) + 2),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
  XLSX.writeFile(wb, nombreArchivo.endsWith(".xlsx") ? nombreArchivo : `${nombreArchivo}.xlsx`);
}
