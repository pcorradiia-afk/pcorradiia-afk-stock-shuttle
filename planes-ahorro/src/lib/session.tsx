"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { USUARIOS, EMPRESAS } from "./demo-data";
import type { Usuario } from "./types";

const STORAGE_KEY = "pa.sesion";

interface EstadoSesion {
  usuarioRealId: string | null; // quién inició sesión
  usuarioActivoId: string | null; // quién se está viendo (puede diferir si se impersona)
  empresaActivaId: string | null; // empresa seleccionada (los clientes no se consolidan entre empresas)
}

interface SesionContextValue {
  usuarioReal: Usuario | null;
  usuarioActivo: Usuario | null;
  impersonando: boolean;
  empresaActivaId: string | null;
  login: (email: string) => { ok: boolean; error?: string };
  logout: () => void;
  setEmpresaActiva: (id: string) => void;
  impersonar: (usuarioId: string) => void;
  dejarDeImpersonar: () => void;
}

const SesionContext = createContext<SesionContextValue | null>(null);

function buscarUsuario(id: string | null): Usuario | null {
  if (!id) return null;
  return USUARIOS.find((u) => u.id === id) ?? null;
}

function empresaInicial(u: Usuario | null): string | null {
  if (!u) return null;
  // Los clientes no se consolidan entre empresas: siempre se ve UNA empresa por vez.
  if (u.alcance === "grupo") return EMPRESAS[0]?.id ?? u.empresaId;
  return u.alcance[0] ?? u.empresaId;
}

export function SesionProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>({
    usuarioRealId: null,
    usuarioActivoId: null,
    empresaActivaId: null,
  });
  const [listo, setListo] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setEstado(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setListo(true);
  }, []);

  const persistir = useCallback((s: EstadoSesion) => {
    setEstado(s);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, []);

  const login: SesionContextValue["login"] = (email) => {
    const u = USUARIOS.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u) return { ok: false, error: "No encontramos un usuario con ese email." };
    if (!u.activo) return { ok: false, error: "El usuario está inactivo." };
    persistir({ usuarioRealId: u.id, usuarioActivoId: u.id, empresaActivaId: empresaInicial(u) });
    return { ok: true };
  };

  const logout = () => persistir({ usuarioRealId: null, usuarioActivoId: null, empresaActivaId: null });

  const setEmpresaActiva = (id: string) =>
    persistir({ ...estado, empresaActivaId: id });

  const impersonar = (usuarioId: string) => {
    const real = buscarUsuario(estado.usuarioRealId);
    if (!real || !real.roles.includes("super_admin")) return;
    const objetivo = buscarUsuario(usuarioId);
    if (!objetivo) return;
    persistir({ ...estado, usuarioActivoId: usuarioId, empresaActivaId: empresaInicial(objetivo) });
  };

  const dejarDeImpersonar = () => {
    const real = buscarUsuario(estado.usuarioRealId);
    persistir({ ...estado, usuarioActivoId: estado.usuarioRealId, empresaActivaId: empresaInicial(real) });
  };

  const usuarioReal = buscarUsuario(estado.usuarioRealId);
  const usuarioActivo = buscarUsuario(estado.usuarioActivoId);
  const impersonando = !!usuarioReal && !!usuarioActivo && usuarioReal.id !== usuarioActivo.id;

  const value: SesionContextValue = {
    usuarioReal,
    usuarioActivo,
    impersonando,
    empresaActivaId: estado.empresaActivaId,
    login,
    logout,
    setEmpresaActiva,
    impersonar,
    dejarDeImpersonar,
  };

  if (!listo) return null;
  return <SesionContext.Provider value={value}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  const ctx = useContext(SesionContext);
  if (!ctx) throw new Error("useSesion debe usarse dentro de <SesionProvider>");
  return ctx;
}
