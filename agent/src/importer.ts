import { createRequire } from "node:module";
import { computarImportacion, type TipoImportacion } from "../../src/lib/importCompute";
import type { ImportacionCalculada } from "../../src/lib/importCompute";

// xlsx es CommonJS: lo cargamos con createRequire para que funcione en Node ESM.
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX = require("xlsx") as typeof import("xlsx");

/** Lee un Excel descargado y lo convierte en la matriz que esperan los parsers. */
export function leerExcel(filePath: string): unknown[][] {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, defval: "" });
}

/**
 * Calcula la importación a partir de un archivo descargado de Oliauto.
 * `headerRow` es 1-indexado (en los exports de Oliauto el encabezado es la fila 1).
 */
export function calcularDesdeArchivo(
  filePath: string,
  tipo: TipoImportacion,
  headerRow = 1,
): ImportacionCalculada {
  const aoa = leerExcel(filePath);
  return computarImportacion(tipo, aoa, headerRow);
}
