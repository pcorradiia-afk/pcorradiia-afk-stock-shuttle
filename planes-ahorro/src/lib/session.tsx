"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { EMPRESAS } from "./demo-data";
import { listarUsuariosCache } from "./store";
import { MODO_DEMO, getSupabase } from "./supabase/client";
import { cargarPerfil, cargarUsuarios, cargarEmpresa } from "./supabase/sync";
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
  cargandoDatos: boolean;
  login: (email: string, password?: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  setEmpresaActiva: (id: string) => void;
  impersonar: (usuarioId: string) => void;
  dejarDeImpersonar: () => void;
}

const SesionContext = createContext<SesionContextValue | null>(null);

function buscarUsuario(id: string | null): Usuario | null {
  if (!id) return null;
  return listarUsuariosCache().find((u) => u.id === id) ?? null;
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
  // En modo real, el perfil llega de la base (no de las constantes demo).
  const [perfilReal, setPerfilReal] = useState<Usuario | null>(null);
  const [listo, setListo] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [tick, setTick] = useState(0);
  void tick;

  const persistir = useCallback((s: EstadoSesion) => {
    setEstado(s);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, []);

  // Restaurar sesión al cargar la página.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      let guardado: EstadoSesion | null = null;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) guardado = JSON.parse(raw);
      } catch { /* ignore */ }

      if (MODO_DEMO) {
        if (guardado) setEstado(guardado);
        setListo(true);
        return;
      }

      // Modo real: validar la sesión de Supabase y reconstruir el perfil.
      const sb = getSupabase();
      const { data } = (await sb?.auth.getSession()) ?? { data: { session: null } };
      if (!data.session?.user) {
        if (!cancelado) setListo(true);
        return;
      }
      const perfil = await cargarPerfil(data.session.user.id);
      if (cancelado) return;
      if (!perfil || !perfil.activo) {
        await sb?.auth.signOut();
        setListo(true);
        return;
      }
      setPerfilReal(perfil);
      await cargarUsuarios();
      const empresa =
        (guardado?.empresaActivaId && (perfil.alcance === "grupo" || perfil.alcance.includes(guardado.empresaActivaId)))
          ? guardado.empresaActivaId
          : empresaInicial(perfil);
      const activo = guardado?.usuarioActivoId && perfil.roles.includes("super_admin")
        ? guardado.usuarioActivoId
        : perfil.id;
      setEstado({ usuarioRealId: perfil.id, usuarioActivoId: activo, empresaActivaId: empresa });
      if (empresa) {
        setCargandoDatos(true);
        await cargarEmpresa(empresa);
        setCargandoDatos(false);
      }
      setListo(true);
      setTick((t) => t + 1);
    })();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login: SesionContextValue["login"] = async (email, password) => {
    if (MODO_DEMO) {
      const u = listarUsuariosCache().find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
      if (!u) return { ok: false, error: "No encontramos un usuario con ese email." };
      if (!u.activo) return { ok: false, error: "El usuario está inactivo." };
      persistir({ usuarioRealId: u.id, usuarioActivoId: u.id, empresaActivaId: empresaInicial(u) });
      return { ok: true };
    }
    const sb = getSupabase();
    if (!sb) return { ok: false, error: "Supabase no está configurado." };
    const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password: password ?? "" });
    if (error || !data.user) {
      return { ok: false, error: "Email o contraseña incorrectos." };
    }
    const perfil = await cargarPerfil(data.user.id);
    if (!perfil) {
      await sb.auth.signOut();
      return { ok: false, error: "Tu usuario no está dado de alta en el sistema. Avisá al administrador." };
    }
    if (!perfil.activo) {
      await sb.auth.signOut();
      return { ok: false, error: "El usuario está inactivo." };
    }
    setPerfilReal(perfil);
    await cargarUsuarios();
    const empresa = empresaInicial(perfil);
    persistir({ usuarioRealId: perfil.id, usuarioActivoId: perfil.id, empresaActivaId: empresa });
    if (empresa) {
      setCargandoDatos(true);
      await cargarEmpresa(empresa);
      setCargandoDatos(false);
    }
    return { ok: true };
  };

  const logout = () => {
    if (!MODO_DEMO) getSupabase()?.auth.signOut();
    setPerfilReal(null);
    persistir({ usuarioRealId: null, usuarioActivoId: null, empresaActivaId: null });
  };

  const setEmpresaActiva = (id: string) => {
    persistir({ ...estado, empresaActivaId: id });
    if (!MODO_DEMO) {
      setCargandoDatos(true);
      cargarEmpresa(id).finally(() => setCargandoDatos(false));
    }
  };

  const resolver = (id: string | null): Usuario | null => {
    if (!id) return null;
    if (perfilReal && perfilReal.id === id) return perfilReal;
    return buscarUsuario(id);
  };

  const usuarioReal = resolver(estado.usuarioRealId);
  const usuarioActivo = resolver(estado.usuarioActivoId);
  const impersonando = !!usuarioReal && !!usuarioActivo && usuarioReal.id !== usuarioActivo.id;

  const impersonar = (usuarioId: string) => {
    if (!usuarioReal || !usuarioReal.roles.includes("super_admin")) return;
    const objetivo = buscarUsuario(usuarioId);
    if (!objetivo) return;
    const empresa = empresaInicial(objetivo);
    persistir({ ...estado, usuarioActivoId: usuarioId, empresaActivaId: empresa });
    if (!MODO_DEMO && empresa) {
      setCargandoDatos(true);
      cargarEmpresa(empresa).finally(() => setCargandoDatos(false));
    }
  };

  const dejarDeImpersonar = () => {
    const empresa = empresaInicial(usuarioReal);
    persistir({ ...estado, usuarioActivoId: estado.usuarioRealId, empresaActivaId: empresa });
    if (!MODO_DEMO && empresa) {
      setCargandoDatos(true);
      cargarEmpresa(empresa).finally(() => setCargandoDatos(false));
    }
  };

  const value: SesionContextValue = {
    usuarioReal,
    usuarioActivo,
    impersonando,
    empresaActivaId: estado.empresaActivaId,
    cargandoDatos,
    login,
    logout,
    setEmpresaActiva,
    impersonar,
    dejarDeImpersonar,
  };

  if (!listo) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Restaurando sesión…
      </div>
    );
  }
  return <SesionContext.Provider value={value}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  const ctx = useContext(SesionContext);
  if (!ctx) throw new Error("useSesion debe usarse dentro de <SesionProvider>");
  return ctx;
}
