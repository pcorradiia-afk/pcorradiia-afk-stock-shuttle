"use client";

// Gestiones: colas de trabajo por campaña de llamados, equivalentes al menú
// "Opciones de Gestión" del sistema actual (SIGNOS). Cada gestión filtra la
// cartera según datos ya importados y se trabaja con el anotador (bitácora).
// ⚠️ Los umbrales marcados "A CONFIRMAR" son supuestos a validar con el cliente.

import type { Cliente } from "./types";

export type GestionTipo =
  | "bienvenida"
  | "mora_temprana"
  | "mora"
  | "ganadores"
  | "licitaciones"
  | "adj_sin_pedido"
  | "altos_ahorros";

export interface GestionDef {
  tipo: GestionTipo;
  titulo: string;
  descripcion: string;
  /** Etiqueta de la columna con el dato clave de la cola. */
  columnaDato: string;
  dato: (c: Cliente) => string;
  filtro: (c: Cliente) => boolean;
}

const DIAS_BIENVENIDA = 60; // A CONFIRMAR: ventana de "recién agrupado"

function diasDesde(fecha: string | null | undefined): number | null {
  if (!fecha) return null;
  const [d, m, a] = fecha.split("/").map(Number);
  if (!d || !m || !a) return null;
  const t = new Date(a, m - 1, d).getTime();
  return Math.floor((Date.now() - t) / 86400000);
}

const esAhorrista = (c: Cliente) => (c.solicitud.statusDesc || "").toUpperCase().includes("AHORRISTA");

export const GESTIONES: GestionDef[] = [
  {
    tipo: "bienvenida",
    titulo: "Bienvenida",
    descripcion: `Clientes agrupados en los últimos ${DIAS_BIENVENIDA} días: llamado de bienvenida. (Ventana A CONFIRMAR)`,
    columnaDato: "Agrupado hace",
    dato: (c) => {
      const d = diasDesde(c.solicitud.fechaAgrupo);
      return d == null ? "—" : `${d} días`;
    },
    filtro: (c) => {
      const d = diasDesde(c.solicitud.fechaAgrupo);
      return d != null && d >= 0 && d <= DIAS_BIENVENIDA;
    },
  },
  {
    tipo: "mora_temprana",
    titulo: "Mora temprana (del mes)",
    descripcion: "Clientes con exactamente 1 cuota impaga: recordatorio suave. (Umbral A CONFIRMAR)",
    columnaDato: "Impagas",
    dato: (c) => String(c.solicitud.impagas ?? "—"),
    filtro: (c) => c.solicitud.impagas === 1,
  },
  {
    tipo: "mora",
    titulo: "Mora",
    descripcion: "Clientes con 2 o más cuotas impagas: gestión de mora. (Umbral A CONFIRMAR)",
    columnaDato: "Impagas",
    dato: (c) => String(c.solicitud.impagas ?? "—"),
    filtro: (c) => (c.solicitud.impagas ?? 0) >= 2,
  },
  {
    tipo: "ganadores",
    titulo: "Ganadores",
    descripcion: "Ganadores de acto (sorteo/licitación) importados: informar la adjudicación.",
    columnaDato: "Acto",
    dato: (c) => c.adjudicacion?.nroActo ? `${c.adjudicacion.nroActo} · ${c.adjudicacion.tipoAdjudicacion ?? ""}`.trim() : "—",
    filtro: (c) => !!c.adjudicacion?.nroActo,
  },
  {
    tipo: "licitaciones",
    titulo: "Incentivo de licitaciones",
    descripcion: "Ahorristas al día (0 impagas, no adjudicados): invitar a licitar. (Criterio A CONFIRMAR)",
    columnaDato: "Cuotas pagas",
    dato: (c) => `${c.solicitud.pagas ?? "—"} / ${c.solicitud.emitidas ?? "—"}`,
    filtro: (c) => esAhorrista(c) && (c.solicitud.impagas ?? 99) === 0 && !c.adjudicacion?.nroActo,
  },
  {
    tipo: "adj_sin_pedido",
    titulo: "Adjudicados sin pedido",
    descripcion: "Adjudicados que aún no ingresaron el pedido (importados del archivo de Ford).",
    columnaDato: "Días / ¿puede pedir?",
    dato: (c) => {
      const a = c.adjudicacion;
      if (!a || a.puedeIngresarPedido == null) return "—";
      return `${a.aging ?? "—"} días · ${a.puedeIngresarPedido ? "SÍ" : `NO (${a.observaciones ?? "obs."})`}`;
    },
    filtro: (c) => c.adjudicacion?.puedeIngresarPedido != null,
  },
  {
    tipo: "altos_ahorros",
    titulo: "Altos ahorros",
    descripcion: "Ahorristas con ≥ 70% del plan pagado: potencial de adjudicación/cambio. (Definición A CONFIRMAR)",
    columnaDato: "% pagado",
    dato: (c) => {
      const { pagas, emitidas } = c.solicitud;
      return pagas != null && emitidas ? `${Math.round((pagas / emitidas) * 100)}%` : "—";
    },
    filtro: (c) => {
      const { pagas, emitidas } = c.solicitud;
      return esAhorrista(c) && pagas != null && !!emitidas && pagas / emitidas >= 0.7;
    },
  },
];

export function colaGestion(clientes: Cliente[], tipo: GestionTipo): Cliente[] {
  const def = GESTIONES.find((g) => g.tipo === tipo)!;
  return clientes.filter(def.filtro);
}
