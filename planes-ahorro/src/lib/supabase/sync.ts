"use client";

// Carga de datos desde Supabase hacia la caché local (localStorage) que usan
// todas las pantallas. Se ejecuta al iniciar sesión y al cambiar de empresa.

import { getSupabase, MODO_DEMO } from "./client";
import { reemplazarDatosEmpresa, setUsuariosCache } from "../store";
import type { Usuario, TipoPerfil, Estadio, RolId } from "../types";

const TABLAS = [
  ["cliente", "clientes"],
  ["comunicacion", "comunicaciones"],
  ["plan", "planes"],
  ["observacion_scoring", "observaciones"],
  ["alerta", "alertas"],
  ["tarea", "tareas"],
  ["movimiento_ctacte", "ctacte"],
] as const;

/** Descarga todos los datos de una empresa y reemplaza la caché local. */
export async function cargarEmpresa(empresaId: string): Promise<boolean> {
  if (MODO_DEMO) return true;
  const sb = getSupabase();
  if (!sb) return false;

  const resultados: Record<string, unknown[]> = {};
  for (const [tabla, clave] of TABLAS) {
    // Paginado de a 1000 (límite por consulta de Supabase).
    const filas: unknown[] = [];
    for (let desde = 0; ; desde += 1000) {
      const { data, error } = await sb.from(tabla).select("data").eq("empresa_id", empresaId).range(desde, desde + 999);
      if (error) {
        console.error(`[cargar ${tabla}]`, error.message);
        return false;
      }
      filas.push(...(data ?? []).map((r: { data: unknown }) => r.data));
      if (!data || data.length < 1000) break;
    }
    resultados[clave] = filas;
  }
  const { data: metas } = await sb.from("meta").select("clave, valor").eq("empresa_id", empresaId);
  reemplazarDatosEmpresa(resultados, (metas ?? []) as { clave: string; valor: string }[]);
  return true;
}

interface FilaUsuario {
  id: string; nombre: string; email: string; empresa_id: string;
  tipo_perfil: TipoPerfil; gestion_id: string | null; activo: boolean;
}

/** Arma el objeto Usuario de la app desde las tablas de acceso. */
export async function cargarPerfil(usuarioId: string): Promise<Usuario | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: u, error } = await sb.from("usuario").select("*").eq("id", usuarioId).single<FilaUsuario>();
  if (error || !u) return null;
  const [roles, membresias, accesos] = await Promise.all([
    sb.from("usuario_rol").select("rol_id").eq("usuario_id", usuarioId),
    sb.from("membresia_empresa").select("empresa_id").eq("usuario_id", usuarioId),
    sb.from("acceso_estadio").select("estadio").eq("usuario_id", usuarioId),
  ]);
  return {
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    empresaId: u.empresa_id,
    sucursalId: null,
    equipoId: null,
    tipoPerfil: u.tipo_perfil,
    gestionId: u.gestion_id,
    roles: (roles.data ?? []).map((r) => r.rol_id as RolId),
    alcance: (membresias.data ?? []).map((m) => m.empresa_id as string),
    estadios: (accesos.data ?? []).map((a) => a.estadio as Estadio),
    activo: u.activo,
  };
}

/** Carga los colegas visibles (para asignar vendedores/tareas, usuarios, impersonar). */
export async function cargarUsuarios(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const [us, roles, membresias, accesos] = await Promise.all([
    sb.from("usuario").select("*"),
    sb.from("usuario_rol").select("usuario_id, rol_id"),
    sb.from("membresia_empresa").select("usuario_id, empresa_id"),
    sb.from("acceso_estadio").select("usuario_id, estadio"),
  ]);
  const lista: Usuario[] = ((us.data ?? []) as FilaUsuario[]).map((u) => ({
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    empresaId: u.empresa_id,
    sucursalId: null,
    equipoId: null,
    tipoPerfil: u.tipo_perfil,
    gestionId: u.gestion_id,
    roles: (roles.data ?? []).filter((r) => r.usuario_id === u.id).map((r) => r.rol_id as RolId),
    alcance: (membresias.data ?? []).filter((m) => m.usuario_id === u.id).map((m) => m.empresa_id as string),
    estadios: (accesos.data ?? []).filter((a) => a.usuario_id === u.id).map((a) => a.estadio as Estadio),
    activo: u.activo,
  }));
  setUsuariosCache(lista);
}
