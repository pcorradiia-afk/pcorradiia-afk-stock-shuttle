import type { RolId } from "./types";
export type { RolId } from "./types";

export const ROLES: { id: RolId; nombre: string; descripcion: string }[] = [
  { id: "super_admin", nombre: "Administrador del sistema", descripcion: "Configura y controla todo. Da de alta usuarios, roles, empresas; puede impersonar." },
  { id: "recepcion", nombre: "Recepción", descripcion: "Ingresa leads y los asigna a un vendedor (email y origen obligatorios)." },
  { id: "vendedor", nombre: "Vendedor", descripcion: "Gestiona leads asignados y propios; cierra ventas." },
  { id: "supervisor_ventas", nombre: "Supervisor de ventas", descripcion: "Ve y reasigna ventas del equipo; gestiona observaciones de scoring." },
  { id: "administracion", nombre: "Administración", descripcion: "Sigue la gestión por estadios habilitados." },
  { id: "supervisor_administracion", nombre: "Supervisor de administración", descripcion: "Recibe alertas, corrige N° de solicitud, supervisa la gestión." },
  { id: "entregas", nombre: "Entregas", descripcion: "Gestiona la entrega del vehículo." },
  { id: "analista_suscripciones", nombre: "Analista de suscripciones", descripcion: "Recibe alertas de scoring observado." },
  { id: "gerencia", nombre: "Gerencia / Dirección (lectura)", descripcion: "Acceso de solo lectura a tableros e informes del grupo. (A confirmar)" },
];

export function nombreRol(id: RolId): string {
  return ROLES.find((r) => r.id === id)?.nombre ?? id;
}

// --- Permisos funcionales (claves) usados para mostrar/ocultar navegación y acciones. ---
// La seguridad real se aplica además con RLS en Supabase (ver CLAUDE.md §4.1).
export type Permiso =
  | "config.empresas"
  | "config.usuarios"
  | "config.roles"
  | "impersonar"
  | "clientes.ver"
  | "clientes.editar"
  | "leads.crear"
  | "leads.reasignar"
  | "importar"
  | "solicitud.corregir_nro"
  | "campanias.enviar"
  | "informes.ver"
  | "auditoria.ver"
  | "planes.gestionar"
  | "venta.cerrar"
  | "ventas.supervisar";

const PERMISOS_POR_ROL: Record<RolId, Permiso[]> = {
  super_admin: [
    "config.empresas", "config.usuarios", "config.roles", "impersonar",
    "clientes.ver", "clientes.editar", "leads.crear", "leads.reasignar",
    "importar", "solicitud.corregir_nro", "campanias.enviar", "informes.ver", "auditoria.ver",
    "planes.gestionar", "venta.cerrar", "ventas.supervisar",
  ],
  recepcion: ["clientes.ver", "clientes.editar", "leads.crear", "leads.reasignar"],
  vendedor: ["clientes.ver", "clientes.editar", "leads.crear", "venta.cerrar"],
  supervisor_ventas: ["clientes.ver", "clientes.editar", "leads.crear", "leads.reasignar", "campanias.enviar", "informes.ver", "venta.cerrar", "ventas.supervisar"],
  administracion: ["clientes.ver", "clientes.editar", "importar", "campanias.enviar", "planes.gestionar"],
  supervisor_administracion: ["clientes.ver", "clientes.editar", "importar", "solicitud.corregir_nro", "campanias.enviar", "auditoria.ver"],
  entregas: ["clientes.ver", "clientes.editar"],
  analista_suscripciones: ["clientes.ver"],
  gerencia: ["clientes.ver", "informes.ver", "auditoria.ver", "ventas.supervisar"],
};

export function tienePermiso(roles: RolId[], permiso: Permiso): boolean {
  return roles.some((r) => PERMISOS_POR_ROL[r]?.includes(permiso));
}

// --- Matriz Rol × Acción (para mostrar en /admin/roles). Niveles: V/C/E/X/—. ---
export type Nivel = "V" | "C" | "E" | "X" | "VCEX" | "VC" | "—" | "✔";

export interface FilaMatriz {
  accion: string;
  niveles: Partial<Record<RolId, Nivel | string>>;
}

export const MATRIZ_PERMISOS: FilaMatriz[] = [
  { accion: "Empresas / sucursales / equipos", niveles: { super_admin: "VCEX", gerencia: "V" } },
  { accion: "Usuarios (alta/baja/edición)", niveles: { super_admin: "VCEX" } },
  { accion: "Cambiar roles", niveles: { super_admin: "VCEX" } },
  { accion: "Asignar estadios a usuarios", niveles: { super_admin: "VCEX" } },
  { accion: "Impersonar usuarios", niveles: { super_admin: "✔" } },
  { accion: "Catálogo de planes", niveles: { super_admin: "VCEX", recepcion: "V", vendedor: "V", supervisor_ventas: "V", administracion: "V", supervisor_administracion: "V", gerencia: "V" } },
  { accion: "Leads — crear", niveles: { super_admin: "C", recepcion: "C", vendedor: "C (propio)", supervisor_ventas: "C" } },
  { accion: "Leads — asignar / reasignar", niveles: { super_admin: "E", recepcion: "E (asignar)", supervisor_ventas: "E (equipo)" } },
  { accion: "Ficha cliente — ver", niveles: { super_admin: "V", recepcion: "V (empresa)", vendedor: "V (propio)", supervisor_ventas: "V (equipo)", administracion: "V (estadios)", supervisor_administracion: "V", entregas: "V (entrega)", analista_suscripciones: "V (scoring)", gerencia: "V" } },
  { accion: "Ficha cliente — editar", niveles: { super_admin: "E", recepcion: "E", vendedor: "E (propio)", supervisor_ventas: "E (equipo)", administracion: "E (estadios)", supervisor_administracion: "E", entregas: "E (entrega)" } },
  { accion: "Bitácora — crear/ver", niveles: { super_admin: "VC", recepcion: "VC", vendedor: "VC (propio)", supervisor_ventas: "VC (equipo)", administracion: "VC", supervisor_administracion: "VC", entregas: "VC", analista_suscripciones: "V", gerencia: "V" } },
  { accion: "Cerrar venta (marcar vendido)", niveles: { super_admin: "E", vendedor: "E (datos obligatorios)", supervisor_ventas: "E (equipo)" } },
  { accion: "N° de solicitud — corregir", niveles: { super_admin: "E", supervisor_administracion: "E" } },
  { accion: "Importar Excel (cartera / Ford)", niveles: { super_admin: "✔", administracion: "✔", supervisor_administracion: "✔" } },
  { accion: "Scoring — registrar resultado", niveles: { super_admin: "E", administracion: "CE", supervisor_administracion: "V", analista_suscripciones: "V" } },
  { accion: "Gestionar observación de scoring", niveles: { supervisor_ventas: "CE (equipo)", supervisor_administracion: "V" } },
  { accion: "Campañas WhatsApp — crear/enviar", niveles: { super_admin: "CE", supervisor_ventas: "C (equipo)", administracion: "CE", supervisor_administracion: "CE" } },
  { accion: "Informes / tableros", niveles: { super_admin: "V (todo)", vendedor: "V (propio)", supervisor_ventas: "V (equipo)", administracion: "V (estadios)", supervisor_administracion: "V", entregas: "V", gerencia: "V (grupo)" } },
  { accion: "Auditoría (log)", niveles: { super_admin: "V", supervisor_administracion: "V", gerencia: "V" } },
];
