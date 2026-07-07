import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** true si NO hay credenciales de Supabase → la app corre con datos demo en el navegador. */
export const MODO_DEMO = !url || !anon;

let cliente: SupabaseClient | null = null;

/** Cliente de Supabase (singleton). Devuelve null en modo demo o en el servidor. */
export function getSupabase(): SupabaseClient | null {
  if (MODO_DEMO || typeof window === "undefined") return null;
  if (!cliente) cliente = createBrowserClient(url!, anon!);
  return cliente;
}

/** @deprecated usar getSupabase() */
export function getSupabaseBrowser() {
  return getSupabase();
}
