// Modelo de dominio del sistema de control de gestión · Grupo Fiorasi.
// En la Fase 2 estas mismas formas se mapean a tablas de Supabase.

/** Período mensual en formato 'YYYY-MM'. */
export type Periodo = string;

/** Departamentos típicos de una concesionaria. */
export type DepartamentoTipo = "0km" | "usados" | "posventa" | "repuestos" | "admin";

export interface Departamento {
  tipo: DepartamentoTipo;
  nombre: string;
  color: string; // para gráficos
}

/** Sistema de gestión (Dealer Management System) del que se importan los datos. */
export type DMS = "Oliauto" | "Autologica";

export interface Empresa {
  id: string;
  nombre: string;
  razonSocial: string;
  cuit: string;
  localidad: string;
  provincia: string;
  marcas: string[];
  /** DMS desde el que se exportan los reportes de esta empresa. */
  dms: DMS;
  sitio: string;
  /** Si participa en el consolidado del grupo. */
  consolida: boolean;
  activa: boolean;
}

export interface Sucursal {
  id: string;
  empresaId: string;
  nombre: string;
  localidad: string;
}

// ---------- Seguridad / RBAC ----------

/** Clave de permiso: `${modulo}.${accion}`. Catálogo en src/auth/permissions.ts */
export type Permiso = string;

export interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
  permisos: Permiso[];
}

/** Alcance de un usuario sobre las empresas del grupo. */
export type Scope = "grupo" | "empresas";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rolId: string;
  scope: Scope;
  /** Empresas asignadas cuando scope = 'empresas'. */
  empresaIds: string[];
  cargo: string;
  activo: boolean;
}

// ---------- Datos de gestión (demo / luego importados del DMS) ----------

/** Resultado mensual por departamento (saldos del mayor agregados). */
export interface ResultadoDepto {
  empresaId: string;
  periodo: Periodo;
  depto: DepartamentoTipo;
  ingresos: number;
  costos: number;
  gastos: number;
}

/** Ventas de unidades por mes (0km / usados). */
export interface VentaUnidades {
  empresaId: string;
  periodo: Periodo;
  depto: Extract<DepartamentoTipo, "0km" | "usados">;
  unidades: number;
  facturacion: number;
  margen: number;
}

/** Antigüedad de saldos de cuentas corrientes deudoras. */
export interface CuentaCorriente {
  empresaId: string;
  periodo: Periodo;
  alDia: number;
  d30: number; // 1-30 días
  d60: number; // 31-60
  d90: number; // 61-90
  mas90: number; // +90
}

export type EstadoHallazgo = "abierto" | "en_proceso" | "resuelto";
export type Severidad = "alta" | "media" | "baja";

export interface Hallazgo {
  id: string;
  empresaId: string;
  titulo: string;
  descripcion: string;
  severidad: Severidad;
  estado: EstadoHallazgo;
  responsable: string;
  detectadoEl: string; // ISO date
}
