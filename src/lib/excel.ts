import * as XLSX from "xlsx";

/** Descarga una matriz simple como .xlsx (sin estilos). */
export function descargarExcel(
  filas: (string | number | null)[][],
  nombreHoja: string,
  nombreArchivo: string,
): void {
  const ws = XLSX.utils.aoa_to_sheet(filas);
  const cols = filas.reduce((m, r) => Math.max(m, r.length), 0);
  ws["!cols"] = Array.from({ length: cols }, (_, i) => ({ wch: i === 0 ? 30 : 16 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nombreHoja.slice(0, 31));
  XLSX.writeFile(wb, nombreArchivo);
}

// ---------------------------------------------------------------------------
// Export con formato (colores, negritas, bordes): generamos un HTML que Excel
// abre nativamente (.xls). Es la vía estándar para estilos sin librerías pagas.
// ---------------------------------------------------------------------------

export interface FilaCuadroExcel {
  concepto: string;
  valores: number[];
  total: number;
  tipo?: "normal" | "subtotal" | "benef";
}

export interface CuadroExcelDef {
  titulo: string;
  subtitulo: string;
  columnas: string[];
  filas: FilaCuadroExcel[];
  /** Base de % por columna (ventas del depto) y total. */
  basesPct: number[];
  baseTotal: number;
  puente: { label: string; valor: number; tipo?: "head" | "final" }[];
  extras: [string, string][];
}

const NAVY = "#2b2a80";
const fmtNum = "mso-number-format:'\\#\\,\\#\\#0'";

function celdaNum(v: number, opts: { bold?: boolean; bg?: string } = {}): string {
  const color = v < 0 ? "color:#c0302b;" : "";
  const bold = opts.bold ? "font-weight:bold;" : "";
  const bg = opts.bg ? `background:${opts.bg};` : "";
  return `<td style="${fmtNum};text-align:right;${color}${bold}${bg}border:0.5pt solid #d4d8de;padding:3px 8px">${Math.round(v)}</td>`;
}

function celdaPct(v: number, base: number, bg?: string): string {
  const p = base ? (v / base) * 100 : 0;
  return `<td style="mso-number-format:'0.0\\%';text-align:right;color:#7a8794;font-size:9pt;${bg ? `background:${bg};` : ""}border:0.5pt solid #d4d8de;padding:3px 6px">${p.toFixed(1)}%</td>`;
}

/** Descarga el cuadro de gestión con formato visual (Excel abre el HTML). */
export function descargarCuadroExcel(def: CuadroExcelDef, nombreArchivo: string): void {
  const nCols = def.columnas.length;

  // Encabezado: por cada depto dos columnas ($ y %), más Total ($ y %).
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8">
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Cuadro de gestión</x:Name>
  <x:WorksheetOptions><x:Print><x:ValidPrinterInfo/></x:Print></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  </head><body>`;

  const anchoTotal = 1 + (nCols + 1) * 2;
  html += `<table style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:10pt">`;
  html += `<tr><td colspan="${anchoTotal}" style="font-size:15pt;font-weight:bold;color:${NAVY};padding:6px 8px">${def.titulo}</td></tr>`;
  html += `<tr><td colspan="${anchoTotal}" style="font-size:10pt;color:#5d6b78;padding:0 8px 8px">${def.subtitulo}</td></tr>`;

  // Header
  html += `<tr><td style="background:${NAVY};color:#fff;font-weight:bold;padding:6px 8px;border:0.5pt solid ${NAVY}">Concepto</td>`;
  for (const c of def.columnas) {
    html += `<td colspan="2" style="background:${NAVY};color:#fff;font-weight:bold;text-align:center;padding:6px 8px;border:0.5pt solid ${NAVY}">${c}</td>`;
  }
  html += `<td colspan="2" style="background:#1d1c59;color:#fff;font-weight:bold;text-align:center;padding:6px 8px;border:0.5pt solid ${NAVY}">TOTAL</td></tr>`;

  // Sub-header $ / %
  html += `<tr><td style="border:0.5pt solid #d4d8de"></td>`;
  for (let i = 0; i <= nCols; i++) {
    const bg = i === nCols ? "background:#eef0f8;" : "";
    html += `<td style="${bg}text-align:right;color:#7a8794;font-size:8.5pt;border:0.5pt solid #d4d8de;padding:2px 8px">$</td><td style="${bg}text-align:right;color:#7a8794;font-size:8.5pt;border:0.5pt solid #d4d8de;padding:2px 6px">% s/vtas</td>`;
  }
  html += `</tr>`;

  // Filas
  for (const f of def.filas) {
    const bg = f.tipo === "subtotal" ? "#f0f2f6" : f.tipo === "benef" ? "#e4e3f3" : undefined;
    const bold = f.tipo === "subtotal" || f.tipo === "benef";
    html += `<tr><td style="${bg ? `background:${bg};` : ""}${bold ? "font-weight:bold;" : ""}padding:3px 8px;border:0.5pt solid #d4d8de;white-space:nowrap">${f.concepto}</td>`;
    f.valores.forEach((v, i) => {
      html += celdaNum(v, { bold, bg }) + celdaPct(v, def.basesPct[i], bg);
    });
    html += celdaNum(f.total, { bold: true, bg: bg ?? "#eef0f8" }) + celdaPct(f.total, def.baseTotal, bg ?? "#eef0f8");
    html += `</tr>`;
  }

  // Puente
  html += `<tr><td colspan="${anchoTotal}" style="padding:10px 8px 4px;font-weight:bold;color:${NAVY};font-size:11pt">Del beneficio operativo al resultado</td></tr>`;
  for (const p of def.puente) {
    const esFinal = p.tipo === "final";
    html += `<tr><td style="${esFinal ? `background:${NAVY};color:#fff;font-weight:bold;` : ""}padding:3px 8px;border:0.5pt solid #d4d8de">${p.label}</td>`;
    html += `<td style="${fmtNum};text-align:right;${esFinal ? `background:${NAVY};color:#fff;font-weight:bold;` : p.valor < 0 ? "color:#c0302b;" : ""}border:0.5pt solid #d4d8de;padding:3px 8px">${Math.round(p.valor)}</td>`;
    html += `<td colspan="${anchoTotal - 2}" style="border:0.5pt solid #d4d8de"></td></tr>`;
  }

  // Extras (PE, margen seguridad…)
  if (def.extras.length) {
    html += `<tr><td colspan="${anchoTotal}" style="padding:10px 8px 4px;font-weight:bold;color:${NAVY};font-size:11pt">Indicadores</td></tr>`;
    for (const [k, v] of def.extras) {
      html += `<tr><td style="padding:3px 8px;border:0.5pt solid #d4d8de">${k}</td><td style="text-align:right;font-weight:bold;border:0.5pt solid #d4d8de;padding:3px 8px">${v}</td><td colspan="${anchoTotal - 2}" style="border:0.5pt solid #d4d8de"></td></tr>`;
    }
  }

  html += `</table></body></html>`;

  const blob = new Blob(["﻿" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo.endsWith(".xls") ? nombreArchivo : nombreArchivo.replace(/\.xlsx?$/, "") + ".xls";
  a.click();
  URL.revokeObjectURL(url);
}
