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
  // De a 400 filas por pedido (las importaciones grandes superan el límite de un POST).
  for (let i = 0; i < payload.length; i += 400) {
    const { error } = await sb.from(tabla).upsert(payload.slice(i, i + 400));
    if (error) {
      // Tabla aún no creada (migración pendiente): queda en el navegador, sin alarmar.
      if (/does not exist|42P01/i.test(error.message)) {
        console.warn(`[nube:${tabla}] tabla pendiente de migración — el dato quedó local`);
        return;
      }
      avisarError(tabla, error.message);
      return;
    }
  }
}

/** Borra filas por id (para deshacer importaciones). RLS limita a las empresas visibles. */
async function eliminar(tabla: string, ids: string[]) {
  if (MODO_DEMO || ids.length === 0) return;
  const sb = getSupabase();
  if (!sb) return;
  for (let i = 0; i < ids.length; i += 200) {
    const { error } = await sb.from(tabla).delete().in("id", ids.slice(i, i + 200));
    if (error && !/does not exist|42P01/i.test(error.message)) {
      avisarError(tabla, error.message);
      return;
    }
  }
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
  recordatorios: (empresaId: string, filas: { id: string }[]) => upsert("recordatorio", empresaId, filas),
  liquidaciones: (empresaId: string, filas: { id: string }[]) => upsert("liquidacion_comision", empresaId, filas),
  comercializadoras: (empresaId: string, filas: { id: string }[]) => upsert("comercializadora", empresaId, filas),
  eliminarClientes: (ids: string[]) => eliminar("cliente", ids),
  eliminarCtaCte: (ids: string[]) => eliminar("movimiento_ctacte", ids),
  // Auditoría: SOLO insert (la política RLS no permite editar ni borrar el log).
  auditoria: async (empresaId: string, filas: { id: string }[]) => {
    if (MODO_DEMO || filas.length === 0) return;
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from("log_auditoria").insert(filas.map((f) => ({ id: f.id, empresa_id: empresaId, data: f })));
    if (error && !/does not exist|42P01/i.test(error.message)) console.error("[nube:log_auditoria]", error.message);
  },
  // La tabla empresa tiene columnas reales (no jsonb) y RLS: solo super admin modifica.
  empresa: async (e: { id: string; nombre: string; nombreComercial: string; cuit: string; activo: boolean }) => {
    if (MODO_DEMO) return;
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from("empresa")
      .update({ nombre: e.nombre, nombre_comercial: e.nombreComercial, cuit: e.cuit, activo: e.activo })
      .eq("id", e.id);
    if (error) avisarError("empresa", error.message);
  },
  meta: async (empresaId: string, clave: string, valor: string) => {
    if (MODO_DEMO) return;
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from("meta").upsert({ empresa_id: empresaId, clave, valor });
    if (error) avisarError("meta", error.message);
  },
};
