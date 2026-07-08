import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Empresa, Permiso, Usuario } from "@/types";
import { EMPRESAS, USUARIOS } from "@/data/demo";
import { pullConfigs } from "@/data/configSync";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { puedeVerEmpresa } from "./permissions";
import { tienePermiso } from "./rolesStore";

const STORAGE_KEY = "fiorasi.session.v1";

/** 'grupo' = vista consolidada; o el id de una empresa puntual. */
export type SeleccionEmpresa = "grupo" | string;

interface PerfilRow {
  email: string;
  nombre: string;
  rol_id: string;
  scope: "grupo" | "empresas";
  empresa_ids: string[];
  cargo: string | null;
  activo: boolean;
}

interface AuthState {
  usuario: Usuario | null;
  /** Autenticación real (Supabase) o modo demo. */
  modoReal: boolean;
  /** true mientras se restaura la sesión real al cargar la app. */
  cargando: boolean;
  /** Empresas que el usuario tiene permitido ver. */
  empresasVisibles: Empresa[];
  /** Si puede usar la vista consolidada del grupo. */
  puedeConsolidar: boolean;
  seleccion: SeleccionEmpresa;
  /** Ids de empresa según la selección actual (para consultar datos). */
  empresaIdsActivos: string[];
  /** Login demo (modo sin Supabase). */
  login: (usuarioId: string) => void;
  /** Login real con email y contraseña. Devuelve mensaje de error o null. */
  loginReal: (email: string, password: string) => Promise<string | null>;
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

function perfilAUsuario(p: PerfilRow): Usuario {
  return {
    id: p.email,
    nombre: p.nombre,
    email: p.email,
    rolId: p.rol_id,
    scope: p.scope,
    empresaIds: p.empresa_ids ?? [],
    cargo: p.cargo ?? "",
    activo: p.activo,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const modoReal = isSupabaseConfigured();

  // ---- Modo demo: restauración síncrona ----
  const persisted = load();
  const usuarioDemoInicial =
    (!modoReal && persisted && USUARIOS.find((x) => x.id === persisted.usuarioId && x.activo)) || null;

  const [usuario, setUsuario] = useState<Usuario | null>(usuarioDemoInicial);
  const [cargando, setCargando] = useState(modoReal);
  const [seleccion, setSeleccionState] = useState<SeleccionEmpresa>(
    usuarioDemoInicial ? persisted!.seleccion : "grupo",
  );

  // ---- Modo real: restaurar sesión de Supabase al montar ----
  useEffect(() => {
    if (!modoReal) return;
    const sb = getSupabase()!;
    let vivo = true;

    // Failsafe: si la restauración no termina en pocos segundos (proyecto
    // Supabase pausado, red caída o getSession que nunca resuelve), no dejamos
    // la app atrapada en el spinner: la liberamos para que caiga al login.
    const failsafe = setTimeout(() => {
      if (vivo) setCargando(false);
    }, 8000);

    async function cargarPerfil(email: string | undefined): Promise<Usuario | null> {
      if (!email) return null;
      const { data } = await sb
        .from("perfiles")
        .select("*")
        .eq("email", email.toLowerCase())
        .maybeSingle();
      const p = data as PerfilRow | null;
      if (!p || !p.activo) return null;
      return perfilAUsuario(p);
    }

    sb.auth
      .getSession()
      .then(async ({ data }) => {
        const u = await cargarPerfil(data.session?.user?.email);
        if (!vivo) return;
        setUsuario(u);
        if (u) {
          const sel = load()?.seleccion;
          if (sel) setSeleccionState(sel);
          // Baja la configuración compartida del grupo (unidades, ajustes, reglas…).
          void pullConfigs();
        }
      })
      .catch((e) => {
        // No se pudo restaurar la sesión: seguimos sin usuario (irá al login).
        console.warn("[auth] no se pudo restaurar la sesión:", e);
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });

    const { data: sub } = sb.auth.onAuthStateChange((evento, session) => {
      if (evento === "SIGNED_OUT") {
        if (vivo) setUsuario(null);
        return;
      }
      if (evento === "SIGNED_IN") {
        // IMPORTANTE: el callback de onAuthStateChange corre con el lock interno
        // de gotrue tomado. Si acá adentro esperamos (await) otra consulta a
        // Supabase (que necesita ese mismo lock), se produce un deadlock y
        // signInWithPassword nunca resuelve → el login queda "pensando".
        // Por eso diferimos el trabajo fuera del callback con setTimeout(0).
        const email = session?.user?.email;
        setTimeout(() => {
          void cargarPerfil(email).then((u) => {
            if (vivo) setUsuario(u);
          });
        }, 0);
      }
    });

    return () => {
      vivo = false;
      clearTimeout(failsafe);
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoReal]);

  const empresasVisibles = useMemo(
    () => EMPRESAS.filter((e) => e.activa && puedeVerEmpresa(usuario, e.id)),
    [usuario],
  );

  const puedeConsolidar = empresasVisibles.length > 1;

  function persist(usuarioId: string, sel: SeleccionEmpresa) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ usuarioId, seleccion: sel } as Persisted));
  }

  function login(usuarioId: string) {
    if (modoReal) return; // en modo real se usa loginReal
    const u = USUARIOS.find((x) => x.id === usuarioId && x.activo) ?? null;
    setUsuario(u);
    if (!u) return;
    const visibles = EMPRESAS.filter((e) => e.activa && puedeVerEmpresa(u, e.id));
    const sel: SeleccionEmpresa = visibles.length > 1 ? "grupo" : visibles[0]?.id ?? "grupo";
    setSeleccionState(sel);
    persist(usuarioId, sel);
  }

  async function loginReal(email: string, password: string): Promise<string | null> {
    const sb = getSupabase();
    if (!sb) return "Supabase no está configurado.";
    // Failsafe: si la red o Supabase no responden, no dejamos el botón girando
    // para siempre; abortamos a los 20s para que el usuario pueda reintentar.
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, rej) => {
      timer = setTimeout(() => rej(new Error("__timeout__")), 20000);
    });
    let data: Awaited<ReturnType<typeof sb.auth.signInWithPassword>>["data"];
    let error: Awaited<ReturnType<typeof sb.auth.signInWithPassword>>["error"];
    try {
      const res = await Promise.race([
        sb.auth.signInWithPassword({ email: email.trim(), password }),
        timeout,
      ]);
      data = res.data;
      error = res.error;
    } catch {
      return "Sin respuesta del servidor. Revisá tu conexión e intentá de nuevo.";
    } finally {
      clearTimeout(timer!);
    }
    if (error) {
      return error.message === "Invalid login credentials"
        ? "Email o contraseña incorrectos."
        : error.message;
    }
    const { data: pData } = await sb
      .from("perfiles")
      .select("*")
      .eq("email", (data.user?.email ?? email).toLowerCase())
      .maybeSingle();
    const p = pData as PerfilRow | null;
    if (!p || !p.activo) {
      await sb.auth.signOut();
      return "Tu usuario no tiene un perfil habilitado. Pedile al administrador que lo cargue en la tabla «perfiles».";
    }
    const u = perfilAUsuario(p);
    setUsuario(u);
    const visibles = EMPRESAS.filter((e) => e.activa && puedeVerEmpresa(u, e.id));
    const sel: SeleccionEmpresa = visibles.length > 1 ? "grupo" : visibles[0]?.id ?? "grupo";
    setSeleccionState(sel);
    persist(u.id, sel);
    void pullConfigs();
    return null;
  }

  function logout() {
    setUsuario(null);
    localStorage.removeItem(STORAGE_KEY);
    if (modoReal) void getSupabase()?.auth.signOut();
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
    modoReal,
    cargando,
    empresasVisibles,
    puedeConsolidar,
    seleccion,
    empresaIdsActivos,
    login,
    loginReal,
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
