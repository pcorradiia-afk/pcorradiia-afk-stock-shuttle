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

// --------- Fase 1: cliente / ahorrista, solicitud y bitácora ---------

export type EstadoCliente = "lead" | "vendido" | "gestionado" | "cartera";
export type NacidoComo = "lead_interno" | "importado_cartera" | "importado_ovalo";
export type TipoDocumento = "DNI" | "CUIT";

export interface Solicitud {
  nroSolicitud: string | null; // ÚNICO E IRREPETIBLE
  grupo: string | null;
  orden: string | null;
  plan: string | null;
  modelo: string | null;
  statusCartera: string | null; // código de FIS (2, 4, 9, ...)
  statusDesc: string | null; // "AHORRISTA AL DIA", etc.
  valorMovil: number | null;
}

export interface Cliente {
  id: string;
  empresaId: string;
  nombreCompleto: string;
  documento: string | null; // DNI o CUIT — ÚNICO por cliente
  tipoDocumento: TipoDocumento | null;
  telefono: string | null;
  email: string | null;
  origenDato: string | null;
  vendedorId: string | null;
  estado: EstadoCliente;
  estadio: Estadio;
  nacidoComo: NacidoComo;
  fechaAlta: string;
  solicitud: Solicitud;
  // Gestión comercial (Fase 2)
  pruebaManejo: boolean | null;
  necesidades: string | null;
  planId: string | null;
  presupuestoNombre: string | null;
  fechaVenta: string | null;
}

// Catálogo de planes (precargado; el vendedor elige de la lista). Base: solapa "Modelo".
export interface Plan {
  id: string;
  empresaId: string;
  codigo: string; // ej. R120, 8084, EC100
  nombre: string;
  modelo: string;
  cuotas: number | null;
  activo: boolean;
}

export interface Comunicacion {
  id: string;
  clienteId: string;
  usuarioId: string;
  usuarioNombre: string;
  fechaHora: string;
  tipoContacto: string; // Llamado, WhatsApp, Email, Presencial, ...
  detalle: string; // lo conversado
  proximaAccion: string | null;
  estadio: Estadio;
}
