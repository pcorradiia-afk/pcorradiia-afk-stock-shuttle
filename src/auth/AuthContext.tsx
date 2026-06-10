import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Empresa, Permiso, Usuario } from "@/types";
import { EMPRESAS, USUARIOS } from "@/data/demo";
import { puedeVerEmpresa, tienePermiso } from "./permissions";

const STORAGE_KEY = "fiorasi.session.v1";

/** 'grupo' = vista consolidada; o el id de una empresa puntual. */
export type SeleccionEmpresa = "grupo" | string;

interface AuthState {
  usuario: Usuario | null;
  /** Empresas que el usuario tiene permitido ver. */
  empresasVisibles: Empresa[];
  /** Si puede usar la vista consolidada del grupo. */
  puedeConsolidar: boolean;
  seleccion: SeleccionEmpresa;
  /** Ids de empresa según la selección actual (para consultar datos). */
  empresaIdsActivos: string[];
  login: (usuarioId: string) => void;
  logout: () => void;
  setSeleccion: (s: SeleccionEmpresa) => void;
  can: (permiso: Permiso) => boolean;
}

const AuthCtx = createContext<AuthState | null>(null);

interface Persisted {
  usuarioId: string;
  seleccion: SeleccionEmpresa;
}

function load(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [seleccion, setSeleccionState] = useState<SeleccionEmpresa>("grupo");

  // Restaurar sesión demo.
  useEffect(() => {
    const p = load();
    if (p) {
      const u = USUARIOS.find((x) => x.id === p.usuarioId && x.activo) ?? null;
      setUsuario(u);
      if (u) setSeleccionState(p.seleccion);
    }
  }, []);

  const empresasVisibles = useMemo(
    () => EMPRESAS.filter((e) => e.activa && puedeVerEmpresa(usuario, e.id)),
    [usuario],
  );

  const puedeConsolidar = empresasVisibles.length > 1;

  function persist(usuarioId: string, sel: SeleccionEmpresa) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ usuarioId, seleccion: sel } as Persisted));
  }

  function login(usuarioId: string) {
    const u = USUARIOS.find((x) => x.id === usuarioId && x.activo) ?? null;
    setUsuario(u);
    if (!u) return;
    const visibles = EMPRESAS.filter((e) => e.activa && puedeVerEmpresa(u, e.id));
    const sel: SeleccionEmpresa = visibles.length > 1 ? "grupo" : visibles[0]?.id ?? "grupo";
    setSeleccionState(sel);
    persist(usuarioId, sel);
  }

  function logout() {
    setUsuario(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  function setSeleccion(s: SeleccionEmpresa) {
    setSeleccionState(s);
    if (usuario) persist(usuario.id, s);
  }

  const empresaIdsActivos = useMemo(() => {
    if (seleccion === "grupo") return empresasVisibles.map((e) => e.id);
    return empresasVisibles.some((e) => e.id === seleccion) ? [seleccion] : [];
  }, [seleccion, empresasVisibles]);

  const value: AuthState = {
    usuario,
    empresasVisibles,
    puedeConsolidar,
    seleccion,
    empresaIdsActivos,
    login,
    logout,
    setSeleccion,
    can: (permiso) => tienePermiso(usuario, permiso),
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
