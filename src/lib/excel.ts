import * as XLSX from "xlsx";

/** Descarga una matriz (filas × columnas) como archivo .xlsx. */
export function descargarExcel(
  filas: (string | number | null)[][],
  nombreHoja: string,
  nombreArchivo: string,
): void {
  const ws = XLSX.utils.aoa_to_sheet(filas);
  // Ancho cómodo para la primera columna (conceptos) y el resto.
  const cols = filas.reduce((m, r) => Math.max(m, r.length), 0);
  ws["!cols"] = Array.from({ length: cols }, (_, i) => ({ wch: i === 0 ? 30 : 16 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nombreHoja.slice(0, 31));
  XLSX.writeFile(wb, nombreArchivo);
}
