import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** true si NO hay credenciales de Supabase → la app corre con datos demo en memoria. */
export const MODO_DEMO = !url || !anon;

/**
 * Cliente de Supabase para el navegador. Devuelve null en modo demo.
 * En Fase 1/2 la capa de datos (src/data) usará este cliente cuando MODO_DEMO sea false.
 */
export function getSupabaseBrowser() {
  if (MODO_DEMO) return null;
  return createBrowserClient(url!, anon!);
}
