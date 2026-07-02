"use client";

// Detección y parseo de TODOS los archivos que hoy se importan al sistema actual
// (ver CLAUDE.md §5.bis): Novedades (cartera), Adjudicatarios sin pedido,
// Ganadores de acto, cta_cte (posicional) y adh (posicional).

import { leerArchivo, mapearFilas, decodificarTexto, type Registro } from "./import-cartera";
import type { FilaCartera } from "./store";
import type { MovimientoCtaCte } from "./types";

export type TipoArchivo = "novedades" | "adjudicatarios" | "ganadores" | "cta_cte" | "adh" | "desconocido";

export const TIPO_LABEL: Record<TipoArchivo, string> = {
  novedades: "Cartera (Novedades)",
  adjudicatarios: "Adjudicatarios sin pedido",
  ganadores: "Ganadores de acto",
  cta_cte: "Cuenta corriente concesionaria",
  adh: "Movimiento por adherente (domicilios)",
  desconocido: "No reconocido",
};

export interface FilaAdjudicatario {
  grupo: string;
  orden: string;
  nombre: string;
  status: string | null;
  modelo: string | null;
  plan: string | null;
  fechaAceptacion: string | null;
  observaciones: string | null;
  aging: number | null;
  puedeIngresarPedido: boolean;
}

export interface FilaGanador {
  nroActo: string;
  grupo: string;
  orden: string;
  nombre: string;
  plan: string | null;
  modelo: string | null;
  tipoAdjudicacion: string | null;
  condicional: string | null;
  importeOferta: number | null;
}

export interface FilaAdh {
  grupo: string;
  orden: string;
  nombre: string;
  codigoPostal: string | null;
  domicilio: string | null;
  localidad: string | null;
  provincia: string | null;
}

export type MovimientoCrudo = Omit<MovimientoCtaCte, "id" | "empresaId">;

export interface ArchivoAnalizado {
  tipo: TipoArchivo;
  cantidad: number;
  cartera?: FilaCartera[];
  adjudicatarios?: FilaAdjudicatario[];
  ganadores?: FilaGanador[];
  movimientos?: MovimientoCrudo[];
  adh?: FilaAdh[];
}

const limpiar = (s: string | undefined | null) => {
  const v = (s ?? "").trim();
  return v === "" ? null : v;
};
const num = (s: string | undefined | null) => {
  if (!s) return null;
  const n = Number(String(s).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

// ---------- Detección + parseo ----------

export async function analizarArchivo(file: File): Promise<ArchivoAnalizado> {
  const nombre = file.name.toLowerCase();

  // Archivos posicionales (.txt): decodificar y mirar la estructura.
  if (nombre.endsWith(".txt")) {
    const texto = await decodificar(file);
    const lineas = texto.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lineas[0]?.startsWith("ECUEADH")) {
      const adh = parseAdh(lineas.slice(1));
      return { tipo: "adh", cantidad: adh.length, adh };
    }
    if (/^\d{6}\d{2}\/\d{2}\/\d{4}[A-Z0-9]{3}/.test(lineas[0] ?? "")) {
      const movimientos = parseCtaCte(lineas);
      return { tipo: "cta_cte", cantidad: movimientos.length, movimientos };
    }
    return { tipo: "desconocido", cantidad: 0 };
  }

  // CSV / Excel: detectar por encabezados.
  const { headers, registros } = await leerArchivo(file);
  const H = new Set(headers.map((h) => h.trim().toUpperCase()));

  if (H.has("PUEDE_INGRESAR_PEDIDO")) {
    const adjudicatarios = registros.map(parseAdjudicatario).filter((f): f is FilaAdjudicatario => !!f);
    return { tipo: "adjudicatarios", cantidad: adjudicatarios.length, adjudicatarios };
  }
  if (H.has("NRO_ACTO") && H.has("TIPO_ADJUDICACION")) {
    const ganadores = registros.map(parseGanador).filter((f): f is FilaGanador => !!f);
    return { tipo: "ganadores", cantidad: ganadores.length, ganadores };
  }
  if (H.has("NRO_SOLICITUD") || H.has("STATUS_DESC")) {
    const cartera = mapearFilas(registros, headers);
    return { tipo: "novedades", cantidad: cartera.length, cartera };
  }
  return { tipo: "desconocido", cantidad: registros.length };
}

function parseAdjudicatario(r: Registro): FilaAdjudicatario | null {
  const grupo = limpiar(r["NRO_GRUPO"]);
  const orden = limpiar(r["NRO_ORDEN"]);
  if (!grupo || !orden) return null;
  return {
    grupo, orden,
    nombre: limpiar(r["APELLIDO Y NOMBRE"]) ?? "",
    status: limpiar(r["STATUS"]),
    modelo: limpiar(r["MODELO"]),
    plan: limpiar(r["PLAN"]),
    fechaAceptacion: limpiar(r["FECHA_ACEPTACION"]),
    observaciones: limpiar(r["VWC079_OBSERVACIONES"]),
    aging: num(r["AGING"]),
    puedeIngresarPedido: (limpiar(r["PUEDE_INGRESAR_PEDIDO"]) ?? "N").toUpperCase() === "S",
  };
}

function parseGanador(r: Registro): FilaGanador | null {
  const grupo = limpiar(r["NRO_GRUPO"]);
  const orden = limpiar(r["NRO_ORDEN"]);
  if (!grupo || !orden) return null;
  return {
    nroActo: limpiar(r["NRO_ACTO"]) ?? "",
    grupo, orden,
    nombre: limpiar(r["APELLIDO Y NOMBRE"]) ?? "",
    plan: limpiar(r["PLAN"]),
    modelo: limpiar(r["MODELO"]),
    tipoAdjudicacion: limpiar(r["TIPO_ADJUDICACION"]),
    condicional: limpiar(r["CONDICIONAL"]),
    importeOferta: num(r["IMPORTE_OFERTA"]),
  };
}

// Layout derivado empíricamente del archivo real (líneas de 82 caracteres):
// conce(0-6) fecha(6-16) código(16-19) descripción(19-52) D/C(52-53) importe(53..-16) referencia(-16).
function parseCtaCte(lineas: string[]): MovimientoCrudo[] {
  const out: MovimientoCrudo[] = [];
  for (const l of lineas) {
    if (l.length < 70) continue;
    const dc = l.slice(52, 53);
    if (dc !== "D" && dc !== "C") continue;
    const resto = l.slice(53);
    const referencia = resto.slice(-16);
    const importe = parseFloat(resto.slice(0, -16).replace(/[$\s]/g, ""));
    if (!Number.isFinite(importe)) continue;
    const grupo = referencia.slice(8, 13);
    const orden = referencia.slice(13, 16);
    out.push({
      concesionario: l.slice(0, 6),
      fecha: l.slice(6, 16),
      codigo: l.slice(16, 19),
      descripcion: l.slice(19, 52).trim(),
      dc,
      importe,
      referencia,
      grupo: grupo === "00000" ? null : grupo,
      orden: grupo === "00000" ? null : orden,
    });
  }
  return out;
}

// Layout derivado empíricamente del archivo real (líneas de 269 caracteres, header "ECUEADH…"):
// grupo(0-5) orden(5-8) … cp(90-96) domicilio(96-124) localidad(124-143) provincia(143-163) nombre(163-200).
// ⚠️ Beta hasta tener el diseño de registro oficial (CLAUDE.md N5). El teléfono se omite por ambigüedad.
function parseAdh(lineas: string[]): FilaAdh[] {
  const out: FilaAdh[] = [];
  for (const l of lineas) {
    if (l.length < 200) continue;
    const grupo = l.slice(0, 5).replace(/^0+/, "");
    const orden = l.slice(5, 8).replace(/^0+(?=\d)/, "");
    if (!/^\d+$/.test(l.slice(0, 8))) continue;
    // El campo CP viene con relleno (ej. "059120" = CP 9120): se toman los últimos 4 dígitos.
    const cp = l.slice(92, 96).replace(/^0+/, "");
    out.push({
      grupo, orden,
      nombre: l.slice(163, 200).replace(/\d+$/, "").trim(),
      codigoPostal: cp || null,
      domicilio: limpiar(l.slice(96, 124)),
      localidad: limpiar(l.slice(124, 143)),
      provincia: limpiar(l.slice(143, 163)),
    });
  }
  return out;
}

async function decodificar(file: File): Promise<string> {
  return decodificarTexto(new Uint8Array(await file.arrayBuffer()));
}
