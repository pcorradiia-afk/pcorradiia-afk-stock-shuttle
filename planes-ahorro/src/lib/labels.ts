import type { Estadio, EstadoCliente } from "./types";

export const ESTADIO_LABEL: Record<Estadio, string> = {
  scoring: "Scoring",
  agrupamiento: "Agrupamiento",
  gestion_cliente: "Gestión de cliente",
  adjudicacion: "Adjudicación",
  pedido: "Pedido",
  patentamiento: "Patentamiento",
  entrega: "Entrega",
};

export const ESTADO_LABEL: Record<EstadoCliente, string> = {
  lead: "Lead",
  vendido: "Vendido",
  gestionado: "Gestionado",
  cartera: "En cartera",
};

export const ESTADIOS: Estadio[] = [
  "scoring", "agrupamiento", "gestion_cliente", "adjudicacion", "pedido", "patentamiento", "entrega",
];

export function pesos(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

export function fechaHora(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}
