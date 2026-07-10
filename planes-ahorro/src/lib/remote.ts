"use client";

// Capa de escritura hacia Supabase. En modo demo, todo es un no-op.
// Cada mutación del store empuja SOLO las filas tocadas (write-through).
// Los errores se loguean y se avisan una única vez por sesión (la copia local
// del navegador nunca se pierde).

import { getSupabase, MODO_DEMO } from "./supabase/client";

let avisado = false;
function avisarError(tabla: string, mensaje: string) {
  console.error(`[nube:${tabla}] ${mensaje}`);
  if (!avisado && typeof window !== "undefined") {
    avisado = true;
    alert("Atención: no se pudo guardar en la nube (" + mensaje + "). Los cambios quedaron en este navegador; reintentá o avisá al administrador.");
  }
}

async function upsert(tabla: string, empresaId: string, filas: { id: string }[]) {
  if (MODO_DEMO || filas.length === 0) return;
  const sb = getSupabase();
  if (!sb) return;
  const payload = filas.map((f) => ({ id: f.id, empresa_id: empresaId, data: f }));
  const { error } = await sb.from(tabla).upsert(payload);
  if (error) avisarError(tabla, error.message);
}

export const remote = {
  clientes: (empresaId: string, filas: { id: string }[]) => upsert("cliente", empresaId, filas),
  comunicaciones: (empresaId: string, filas: { id: string }[]) => upsert("comunicacion", empresaId, filas),
  planes: (empresaId: string, filas: { id: string }[]) => upsert("plan", empresaId, filas),
  observaciones: (empresaId: string, filas: { id: string }[]) => upsert("observacion_scoring", empresaId, filas),
  alertas: (empresaId: string, filas: { id: string }[]) => upsert("alerta", empresaId, filas),
  tareas: (empresaId: string, filas: { id: string }[]) => upsert("tarea", empresaId, filas),
  ctacte: (empresaId: string, filas: { id: string }[]) => upsert("movimiento_ctacte", empresaId, filas),
  plantillasWa: (empresaId: string, filas: { id: string }[]) => upsert("plantilla_wa", empresaId, filas),
  campaniasWa: (empresaId: string, filas: { id: string }[]) => upsert("campania_wa", empresaId, filas),
  enviosWa: (empresaId: string, filas: { id: string }[]) => upsert("envio_wa", empresaId, filas),
  meta: async (empresaId: string, clave: string, valor: string) => {
    if (MODO_DEMO) return;
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from("meta").upsert({ empresa_id: empresaId, clave, valor });
    if (error) avisarError("meta", error.message);
  },
};
