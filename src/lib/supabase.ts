import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db-types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * `true` cuando la app tiene configuradas las claves de Supabase.
 * Si es `false`, mostramos una pantalla de ayuda con el paso a paso
 * en vez de romper la app.
 */
export const SUPABASE_READY = Boolean(url && anonKey);

// Si faltan las claves usamos placeholders para que `createClient` no explote
// al importar; igual nunca se llega a usar porque cortamos antes con SUPABASE_READY.
export const supabase = createClient<Database>(
  url || "https://placeholder.supabase.co",
  anonKey || "public-anon-key-placeholder",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Lock "pass-through": evita que getSession() se cuelgue esperando un
      // navigator.lock que quedó tomado por otra pestaña (eso dejaba la app en
      // "Cargando…" para siempre). Para una PWA de uso personal alcanza con no
      // serializar entre pestañas.
      lock: async (_name, _acquireTimeout, fn) => fn(),
    },
  }
);
