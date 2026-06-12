import { useEffect } from "react";
import { useSyncExternalStore } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

// Anotaciones de usuario, local-first: se guardan en el navegador y se
// sincronizan con Supabase si está configurado. Cada nota se ancla a un
// "contexto" (una pantalla o una empresa/período) para mostrarse donde importa.

export interface Anotacion {
  id: string;
  contexto: string;
  empresa_id: string | null;
  texto: string;
  autor: string | null;
  creado_el: string;
}

const KEY = "fiorasi.anotaciones.v1";
const EVENTO = "fiorasi:anotaciones";

function leer(): Anotacion[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Anotacion[]) : [];
  } catch {
    return [];
  }
}

function escribir(lista: Anotacion[]) {
  localStorage.setItem(KEY, JSON.stringify(lista));
  window.dispatchEvent(new Event(EVENTO));
}

function suscribir(cb: () => void) {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
}

export async function agregarAnotacion(args: {
  contexto: string;
  texto: string;
  empresaId?: string | null;
  autor?: string | null;
}): Promise<void> {
  const nota: Anotacion = {
    id: crypto.randomUUID(),
    contexto: args.contexto,
    empresa_id: args.empresaId ?? null,
    texto: args.texto.trim(),
    autor: args.autor ?? null,
    creado_el: new Date().toISOString(),
  };
  if (!nota.texto) return;
  escribir([nota, ...leer()]);
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from("anotaciones").insert(nota);
    if (error) throw new Error(error.message);
  }
}

export async function borrarAnotacion(id: string): Promise<void> {
  escribir(leer().filter((a) => a.id !== id));
  const sb = getSupabase();
  if (sb) await sb.from("anotaciones").delete().eq("id", id);
}

async function sincronizar(contexto: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data, error } = await sb.from("anotaciones").select("*").eq("contexto", contexto);
  if (error || !data) return;
  const porId = new Map<string, Anotacion>();
  for (const a of leer()) porId.set(a.id, a);
  for (const a of data as Anotacion[]) porId.set(a.id, a);
  escribir([...porId.values()].sort((a, b) => (a.creado_el < b.creado_el ? 1 : -1)));
}

let cache: { key: string; val: Anotacion[] } | null = null;
function snapshot(contexto: string): Anotacion[] {
  const val = leer().filter((a) => a.contexto === contexto).sort((a, b) => (a.creado_el < b.creado_el ? 1 : -1));
  const key = contexto + "|" + val.map((a) => a.id).join(",");
  if (cache && cache.key === key) return cache.val;
  cache = { key, val };
  return val;
}

/** Anotaciones de un contexto (reactivo, local + nube). */
export function useAnotaciones(contexto: string): Anotacion[] {
  const lista = useSyncExternalStore(suscribir, () => snapshot(contexto), () => []);
  useEffect(() => {
    if (isSupabaseConfigured()) sincronizar(contexto).catch(() => {});
  }, [contexto]);
  return lista;
}
