import type { Permiso, Rol, Usuario } from "@/types";

/**
 * Catálogo de permisos. Clave = `${modulo}.${accion}`.
 * Esta es la fuente de verdad del RBAC; en Supabase vivirá en una tabla `permissions`.
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

/** Roles predefinidos del grupo (editables en la Fase 1 / Supabase). */
export const ROLES: Rol[] = [
  {
    id: "superadmin",
    nombre: "SuperAdmin",
    descripcion: "Configura empresas, usuarios y roles. Acceso total.",
    permisos: [...TODOS_LOS_PERMISOS],
  },
  {
    id: "direccion",
    nombre: "Dirección",
    descripcion: "Dueños/dirección. Ve todos los tableros e informes del grupo (solo lectura).",
    permisos: [
      PERMISOS.DASHBOARD_VER,
      PERMISOS.RENTABILIDAD_VER,
      PERMISOS.COMERCIAL_VER,
      PERMISOS.CC_VER,
      PERMISOS.AUDITORIA_VER,
    ],
  },
  {
    id: "controller",
    nombre: "Controller / Gerencia",
    descripcion: "Importa datos, analiza y arma tableros de las empresas asignadas.",
    permisos: [
      PERMISOS.DASHBOARD_VER,
      PERMISOS.RENTABILIDAD_VER,
      PERMISOS.COMERCIAL_VER,
      PERMISOS.CC_VER,
      PERMISOS.AUDITORIA_VER,
      PERMISOS.IMPORTAR_EJECUTAR,
    ],
  },
  {
    id: "auditor",
    nombre: "Auditoría interna",
    descripcion: "Lectura amplia + gestión de hallazgos y trazabilidad.",
    permisos: [
      PERMISOS.DASHBOARD_VER,
      PERMISOS.RENTABILIDAD_VER,
      PERMISOS.COMERCIAL_VER,
      PERMISOS.CC_VER,
      PERMISOS.AUDITORIA_VER,
      PERMISOS.AUDITORIA_GESTIONAR,
    ],
  },
  {
    id: "responsable",
    nombre: "Responsable de empresa",
    descripcion: "Ve y carga solo lo de su(s) empresa(s) asignada(s).",
    permisos: [
      PERMISOS.DASHBOARD_VER,
      PERMISOS.RENTABILIDAD_VER,
      PERMISOS.COMERCIAL_VER,
      PERMISOS.CC_VER,
    ],
  },
];

export function getRol(rolId: string): Rol | undefined {
  return ROLES.find((r) => r.id === rolId);
}

/** ¿El usuario tiene este permiso (según su rol)? */
export function tienePermiso(usuario: Usuario | null, permiso: Permiso): boolean {
  if (!usuario) return false;
  const rol = getRol(usuario.rolId);
  return !!rol?.permisos.includes(permiso);
}

/** ¿El usuario puede ver datos de esta empresa (según su alcance)? */
export function puedeVerEmpresa(usuario: Usuario | null, empresaId: string): boolean {
  if (!usuario) return false;
  if (usuario.scope === "grupo") return true;
  return usuario.empresaIds.includes(empresaId);
}
