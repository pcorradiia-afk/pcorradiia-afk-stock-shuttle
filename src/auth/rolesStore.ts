import { useSyncExternalStore } from "react";
import type { Permiso, Rol, Usuario } from "@/types";
import { PERMISOS, TODOS_LOS_PERMISOS } from "./permissions";

/** Roles predefinidos del grupo (no se pueden borrar). */
export const ROLES_DEFAULT: Rol[] = [
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
    permisos: [PERMISOS.DASHBOARD_VER, PERMISOS.RENTABILIDAD_VER, PERMISOS.COMERCIAL_VER, PERMISOS.CC_VER, PERMISOS.AUDITORIA_VER],
  },
  {
    id: "controller",
    nombre: "Controller / Gerencia",
    descripcion: "Importa datos, analiza y arma tableros de las empresas asignadas.",
    permisos: [PERMISOS.DASHBOARD_VER, PERMISOS.RENTABILIDAD_VER, PERMISOS.COMERCIAL_VER, PERMISOS.CC_VER, PERMISOS.AUDITORIA_VER, PERMISOS.IMPORTAR_EJECUTAR],
  },
  {
    id: "auditor",
    nombre: "Auditoría interna",
    descripcion: "Lectura amplia + gestión de hallazgos y trazabilidad.",
    permisos: [PERMISOS.DASHBOARD_VER, PERMISOS.RENTABILIDAD_VER, PERMISOS.COMERCIAL_VER, PERMISOS.CC_VER, PERMISOS.AUDITORIA_VER, PERMISOS.AUDITORIA_GESTIONAR],
  },
  {
    id: "responsable",
    nombre: "Responsable de empresa",
    descripcion: "Ve y carga solo lo de su(s) empresa(s) asignada(s).",
    permisos: [PERMISOS.DASHBOARD_VER, PERMISOS.RENTABILIDAD_VER, PERMISOS.COMERCIAL_VER, PERMISOS.CC_VER],
  },
];

const DEFAULT_IDS = new Set(ROLES_DEFAULT.map((r) => r.id));
export function esRolDefault(id: string): boolean {
  return DEFAULT_IDS.has(id);
}

// ---- Store reactivo persistido en localStorage (en Fase 2 pasa a Supabase) ----

const STORAGE_KEY = "fiorasi.roles.v1";

function loadCustom(): Rol[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Rol[]) : [];
  } catch {
    return [];
  }
}

let customRoles: Rol[] = loadCustom();
let snapshot: Rol[] = [...ROLES_DEFAULT, ...customRoles];
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customRoles));
  } catch {
    /* almacenamiento no disponible */
  }
}

function emit() {
  snapshot = [...ROLES_DEFAULT, ...customRoles];
  persist();
  listeners.forEach((l) => l());
}

export function subscribeRoles(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRolesSnapshot(): Rol[] {
  return snapshot;
}

export function getRol(id: string): Rol | undefined {
  return snapshot.find((r) => r.id === id);
}

/** ¿El usuario tiene este permiso (según su rol)? */
export function tienePermiso(usuario: Usuario | null, permiso: Permiso): boolean {
  if (!usuario) return false;
  return !!getRol(usuario.rolId)?.permisos.includes(permiso);
}

function generarId(nombre: string): string {
  const base = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "rol";
  let id = base;
  let i = 2;
  const existe = (x: string) => snapshot.some((r) => r.id === x);
  while (existe(id)) id = `${base}_${i++}`;
  return id;
}

export function addRole(input: { nombre: string; descripcion: string; permisos: Permiso[] }): Rol {
  const rol: Rol = {
    id: generarId(input.nombre),
    nombre: input.nombre.trim(),
    descripcion: input.descripcion.trim(),
    permisos: TODOS_LOS_PERMISOS.filter((p) => input.permisos.includes(p)),
  };
  customRoles = [...customRoles, rol];
  emit();
  return rol;
}

export function deleteRole(id: string): void {
  if (esRolDefault(id)) return;
  customRoles = customRoles.filter((r) => r.id !== id);
  emit();
}

/** Hook reactivo: re-renderiza al crear/borrar roles. */
export function useRoles(): Rol[] {
  return useSyncExternalStore(subscribeRoles, getRolesSnapshot, getRolesSnapshot);
}
