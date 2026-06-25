// Modelo de dominio — Fase 0 (organización, accesos) + tipos compartidos.
// Ver planes-ahorro/CLAUDE.md §3 para el modelo completo.

export type RolId =
  | "super_admin"
  | "recepcion"
  | "vendedor"
  | "supervisor_ventas"
  | "administracion"
  | "supervisor_administracion"
  | "entregas"
  | "analista_suscripciones"
  | "gerencia";

export type TipoPerfil = "concesionario" | "terciarizada";

export type Estadio =
  | "scoring"
  | "agrupamiento"
  | "gestion_cliente"
  | "adjudicacion"
  | "pedido"
  | "patentamiento"
  | "entrega";

export interface Empresa {
  id: string;
  nombre: string;
  cuit: string;
  nombreComercial: string;
  activo: boolean;
}

export interface Sucursal {
  id: string;
  empresaId: string;
  nombre: string;
  activo: boolean;
}

export interface Equipo {
  id: string;
  sucursalId: string;
  nombre: string;
  tipo: "ventas" | "administracion";
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  empresaId: string;
  sucursalId: string | null;
  equipoId: string | null;
  tipoPerfil: TipoPerfil;
  roles: RolId[];
  /** Empresas que puede operar con un único login (alcance multiempresa). "grupo" = todas. */
  alcance: "grupo" | string[];
  /** Estadios de administración habilitados (solo aplica a rol administración). */
  estadios: Estadio[];
  activo: boolean;
}

export interface RegistroAuditoria {
  id: string;
  usuarioId: string;
  accion: string;
  entidad: string;
  entidadId: string | null;
  fechaHora: string;
  detalle?: string;
}
