import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/db-types";
import { DEMO_USER } from "@/lib/demo";

interface AuthState {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  /** Refresca el profile desde la base (después de crearlo/editarlo). */
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return;
        setSession(data.session);
        if (data.session?.user) await loadProfile(data.session.user.id);
      })
      .catch(() => {
        /* si falla la lectura de sesión, igual salimos de "Cargando…" */
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    // OJO: no usar `await` de consultas a Supabase DENTRO de este callback.
    // El cliente de auth mantiene un lock mientras corre el callback, y una
    // consulta (que necesita la sesión) se queda esperando ese mismo lock →
    // deadlock y la app queda en "Cargando…" para siempre. Por eso diferimos
    // la carga del perfil con setTimeout(0), que libera el lock primero.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        const uid = newSession.user.id;
        setTimeout(() => {
          if (active) loadProfile(uid);
        }, 0);
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ loading, session, profile, refreshProfile, signOut }),
    [loading, session, profile, refreshProfile, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Proveedor de auth para el modo demo (sin Supabase). */
export function DemoAuthProvider({ children }: { children: React.ReactNode }) {
  const value: AuthState = {
    loading: false,
    session: { user: { id: "me", email: "vos@demo.com" } } as unknown as Session,
    profile: DEMO_USER,
    refreshProfile: async () => {},
    signOut: async () => {},
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
