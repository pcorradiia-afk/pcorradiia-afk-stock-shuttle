"use client";

// Lectura y mapeo del archivo de cartera "Novedades" (CSV con separador ; o Excel).
// Ver columnas reales en planes-ahorro/CLAUDE.md §5.bis.1.

import * as XLSX from "xlsx";
import type { FilaCartera } from "./store";

export type Registro = Record<string, string>;

// Encabezados esperados (se buscan sin distinguir mayúsculas/espacios). Mapeo configurable:
// si Ford/FIS cambia un nombre de columna, se ajusta acá.
export const MAPEO_NOVEDADES: Record<keyof FilaCartera, string[]> = {
  nroSolicitud: ["NRO_SOLICITUD", "Nro. Solicitud", "NRO SOLICITUD"],
  grupo: ["NRO_GRUPO", "GRUPO"],
  orden: ["NRO_ORDEN", "ORDEN"],
  nombreCompleto: ["APELLIDO Y NOMBRE", "NOMBRE_COMPLETO", "Nombre Completo", "NOMBRES"],
  telefono: ["CELULAR", "TELEFONO_PARTICULAR", "TELEFONO_LABORAL"],
  email: ["EMAIL", "MAIL"],
  plan: ["PLAN", "Plan Arranque"],
  modelo: ["MODELO"],
  statusCartera: ["STATUS"],
  statusDesc: ["STATUS_DESC"],
  valorMovil: ["VALOR_MOVIL", "Valor movil"],
  fechaAgrupo: ["FECHA_AGRUPO", "Fecha de Proceso Ovalo"],
  emitidas: ["EMITIDAS", "Emi"],
  pagas: ["PAGA", "Pag"],
  impagas: ["IMPAGA", "Impaga"],
  licito: ["LICITO", "Lic"],
  adelanto: ["ADELANTO", "Adelanto"],
  porcentaje: ["PORCENTAJE", "Porcentaje"],
  debCred: ["DEB_CRED"],
};

function norm(s: string) {
  return s.trim().toUpperCase().replace(/\s+/g, " ");
}

/** Resuelve, para cada campo, qué encabezado real del archivo le corresponde. */
export function detectarMapeo(headers: string[]): Partial<Record<keyof FilaCartera, string>> {
  const normMap = new Map(headers.map((h) => [norm(h), h]));
  const out: Partial<Record<keyof FilaCartera, string>> = {};
  (Object.keys(MAPEO_NOVEDADES) as (keyof FilaCartera)[]).forEach((campo) => {
    for (const cand of MAPEO_NOVEDADES[campo]) {
      const real = normMap.get(norm(cand));
      if (real) {
        out[campo] = real;
        break;
      }
    }
  });
  return out;
}

function parseNumero(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(String(v).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function limpiar(v: string | undefined): string | null {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
}

export function mapearFilas(registros: Registro[], headers: string[]): FilaCartera[] {
  const m = detectarMapeo(headers);
  const get = (r: Registro, campo: keyof FilaCartera) => (m[campo] ? r[m[campo]!] : undefined);
  return registros.map((r) => ({
    nroSolicitud: limpiar(get(r, "nroSolicitud")),
    grupo: limpiar(get(r, "grupo")),
    orden: limpiar(get(r, "orden")),
    nombreCompleto: (limpiar(get(r, "nombreCompleto")) ?? "").toString(),
    telefono: limpiar(get(r, "telefono")),
    email: limpiar(get(r, "email")),
    plan: limpiar(get(r, "plan")),
    modelo: limpiar(get(r, "modelo")),
    statusCartera: limpiar(get(r, "statusCartera")),
    statusDesc: limpiar(get(r, "statusDesc")),
    valorMovil: parseNumero(get(r, "valorMovil")),
    fechaAgrupo: limpiar(get(r, "fechaAgrupo"))?.split(" ")[0] ?? null, // "29/02/2024 0:00" → "29/02/2024"
    emitidas: parseNumero(get(r, "emitidas")),
    pagas: parseNumero(get(r, "pagas")),
    impagas: parseNumero(get(r, "impagas")),
    licito: parseNumero(get(r, "licito")),
    adelanto: parseNumero(get(r, "adelanto")),
    porcentaje: parseNumero(get(r, "porcentaje")),
    debCred: limpiar(get(r, "debCred")),
  }));
}

// --- Parser CSV (maneja comillas y separador configurable) ---
function parseCSV(texto: string): { headers: string[]; registros: Registro[] } {
  let t = texto.replace(/^﻿/, ""); // BOM
  const lineas = t.split(/\r?\n/);
  // Primera línea "sep=;" indica el separador (formato de Excel/FIS).
  let sep = ";";
  if (/^sep=/i.test(lineas[0])) {
    sep = lineas[0].split("=")[1]?.charAt(0) || ";";
    lineas.shift();
  } else {
    // Detectar por la cabecera: usar el separador más frecuente.
    const head = lineas[0] || "";
    sep = (head.split(";").length > head.split(",").length) ? ";" : ",";
  }
  const filas = lineas
    .filter((l) => l.trim() !== "")
    .map((l) => splitCSVLine(l, sep));
  const headers = (filas.shift() || []).map((h) => h.trim());
  const registros: Registro[] = filas.map((cols) => {
    const r: Registro = {};
    headers.forEach((h, i) => (r[h] = (cols[i] ?? "").trim()));
    return r;
  });
  return { headers, registros };
}

function splitCSVLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let enComillas = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (enComillas && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        enComillas = !enComillas;
      }
    } else if (ch === sep && !enComillas) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/** Matriz cruda de un Excel (para formatos con encabezados que no están en la fila 1). */
export async function leerMatrizExcel(file: File): Promise<string[][]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "", raw: false });
}

/** Lee el archivo subido (CSV o Excel) y devuelve encabezados + registros crudos. */
export async function leerArchivo(file: File): Promise<{ headers: string[]; registros: Registro[] }> {
  const nombre = file.name.toLowerCase();
  if (nombre.endsWith(".csv") || file.type.includes("csv") || file.type.startsWith("text/")) {
    const texto = await leerTexto(file);
    return parseCSV(texto);
  }
  // Excel (.xls / .xlsx) con SheetJS.
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const matriz = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "", raw: false });
  const headers = (matriz[0] || []).map((h) => String(h).trim());
  const registros: Registro[] = matriz.slice(1).map((cols) => {
    const r: Registro = {};
    headers.forEach((h, i) => (r[h] = String((cols as string[])[i] ?? "").trim()));
    return r;
  });
  return { headers, registros };
}

// Detecta el encoding y devuelve texto. Los exports de FIS/Plan Óvalo llegan en
// UTF-8, UTF-16 (con BOM) o incluso UTF-32 sin BOM (ej. Ganadores_Acto): en esos
// casos los bytes nulos intercalados se descartan tras decodificar como Latin-1.
export function decodificarTexto(buf: Uint8Array): string {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(buf).replace(/\u0000/g, "");
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(buf).replace(/\u0000/g, "");
  }
  // Contar bytes nulos: si abundan, es UTF-16/32 sin BOM → Latin-1 + descartar nulos.
  let ceros = 0;
  const muestra = Math.min(buf.length, 4000);
  for (let i = 0; i < muestra; i++) if (buf[i] === 0) ceros++;
  if (ceros > muestra * 0.2) {
    return new TextDecoder("latin1").decode(buf).replace(/\u0000/g, "");
  }
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  // Si la decodificación UTF-8 rompió acentos (�), reintentar como Latin-1.
  return utf8.includes("�") ? new TextDecoder("latin1").decode(buf) : utf8;
}

async function leerTexto(file: File): Promise<string> {
  return decodificarTexto(new Uint8Array(await file.arrayBuffer()));
}
