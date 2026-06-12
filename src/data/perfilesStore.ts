import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

// Gestión de perfiles de usuario contra la tabla `perfiles` de Supabase.
// La creación del login (email+contraseña) se hace en Authentication; acá se
// administra el perfil: rol, alcance, empresas y estado activo.

export interface Perfil {
  email: string;
  nombre: string;
  rol_id: string;
  scope: "grupo" | "empresas";
  empresa_ids: string[];
  cargo: string;
  activo: boolean;
}

const EVENTO = "fiorasi:perfiles";

export async function listarPerfiles(): Promise<Perfil[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("perfiles").select("*").order("nombre");
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    email: p.email,
    nombre: p.nombre,
    rol_id: p.rol_id,
    scope: p.scope,
    empresa_ids: p.empresa_ids ?? [],
    cargo: p.cargo ?? "",
    activo: p.activo,
  }));
}

/** Crea o actualiza un perfil (por email). */
export async function guardarPerfil(p: Perfil): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase no está configurado.");
  const { error } = await sb.from("perfiles").upsert({
    email: p.email.trim().toLowerCase(),
    nombre: p.nombre.trim(),
    rol_id: p.rol_id,
    scope: p.scope,
    empresa_ids: p.scope === "grupo" ? [] : p.empresa_ids,
    cargo: p.cargo.trim(),
    activo: p.activo,
  });
  if (error) throw new Error(error.message);
  window.dispatchEvent(new Event(EVENTO));
}

export async function borrarPerfil(email: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase no está configurado.");
  const { error } = await sb.from("perfiles").delete().eq("email", email);
  if (error) throw new Error(error.message);
  window.dispatchEvent(new Event(EVENTO));
}

/** Hook que carga la lista de perfiles y se refresca tras cada cambio. */
export function usePerfiles(): { perfiles: Perfil[]; cargando: boolean; error: string | null; recargar: () => void } {
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setCargando(false);
      return;
    }
    let vivo = true;
    setCargando(true);
    listarPerfiles()
      .then((p) => vivo && (setPerfiles(p), setError(null)))
      .catch((e) => vivo && setError((e as Error).message))
      .finally(() => vivo && setCargando(false));
    const refrescar = () => setN((x) => x + 1);
    window.addEventListener(EVENTO, refrescar);
    return () => {
      vivo = false;
      window.removeEventListener(EVENTO, refrescar);
    };
  }, [n]);

  return { perfiles, cargando, error, recargar: () => setN((x) => x + 1) };
}
