import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Conexión a Supabase. Si las variables de entorno no están cargadas, la app
// sigue funcionando en modo demo (sin persistencia): toda la UI verifica
// `isSupabaseConfigured()` antes de intentar guardar o leer de la base.

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/** ¿Hay credenciales de Supabase cargadas en este entorno? */
export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey && url.startsWith("http"));
}

let cliente: SupabaseClient | null = null;

/** Cliente de Supabase (singleton). Devuelve null si no está configurado. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!cliente) {
    cliente = createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return cliente;
}
