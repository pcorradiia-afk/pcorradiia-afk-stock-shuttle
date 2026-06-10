import type { Permiso, Usuario } from "@/types";

/**
 * Catálogo de permisos. Clave = `${modulo}.${accion}`.
 * Es la fuente de verdad del RBAC; en Supabase vivirá en una tabla `permissions`.
 */
export const PERMISOS = {
  DASHBOARD_VER: "dashboard.ver",
  RENTABILIDAD_VER: "rentabilidad.ver",
  COMERCIAL_VER: "comercial.ver",
  CC_VER: "cuentas_corrientes.ver",
  AUDITORIA_VER: "auditoria.ver",
  AUDITORIA_GESTIONAR: "auditoria.gestionar",
  IMPORTAR_EJECUTAR: "importar.ejecutar",
  ADMIN_EMPRESAS: "admin.empresas",
  ADMIN_USUARIOS: "admin.usuarios",
  ADMIN_ROLES: "admin.roles",
} as const;

export const TODOS_LOS_PERMISOS: Permiso[] = Object.values(PERMISOS);

/** Etiqueta legible de cada permiso. */
export const PERMISO_LABEL: Record<string, string> = {
  [PERMISOS.DASHBOARD_VER]: "Ver tablero",
  [PERMISOS.RENTABILIDAD_VER]: "Ver rentabilidad",
  [PERMISOS.COMERCIAL_VER]: "Ver ventas",
  [PERMISOS.CC_VER]: "Ver cuentas corrientes",
  [PERMISOS.AUDITORIA_VER]: "Ver auditoría",
  [PERMISOS.AUDITORIA_GESTIONAR]: "Gestionar hallazgos",
  [PERMISOS.IMPORTAR_EJECUTAR]: "Importar del DMS",
  [PERMISOS.ADMIN_EMPRESAS]: "Administrar empresas",
  [PERMISOS.ADMIN_USUARIOS]: "Administrar usuarios",
  [PERMISOS.ADMIN_ROLES]: "Administrar roles",
};

/** Permisos agrupados por área (para formularios). */
export const PERMISOS_AGRUPADOS: { grupo: string; permisos: Permiso[] }[] = [
  { grupo: "Gestión", permisos: [PERMISOS.DASHBOARD_VER, PERMISOS.RENTABILIDAD_VER, PERMISOS.COMERCIAL_VER, PERMISOS.CC_VER] },
  { grupo: "Auditoría", permisos: [PERMISOS.AUDITORIA_VER, PERMISOS.AUDITORIA_GESTIONAR] },
  { grupo: "Datos", permisos: [PERMISOS.IMPORTAR_EJECUTAR] },
  { grupo: "Administración", permisos: [PERMISOS.ADMIN_EMPRESAS, PERMISOS.ADMIN_USUARIOS, PERMISOS.ADMIN_ROLES] },
];

/** ¿El usuario puede ver datos de esta empresa (según su alcance)? */
export function puedeVerEmpresa(usuario: Usuario | null, empresaId: string): boolean {
  if (!usuario) return false;
  if (usuario.scope === "grupo") return true;
  return usuario.empresaIds.includes(empresaId);
}
