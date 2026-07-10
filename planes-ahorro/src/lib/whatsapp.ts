"use client";

// Envío de WhatsApp (Fase 4). El sistema NO envía por su cuenta: se integra con
// un proveedor BSP (Twilio, 360dialog, Gupshup, WATI…) detrás de esta interfaz.
// Hasta que el cliente elija el BSP (CLAUDE.md Q6) se usa el PROVEEDOR SIMULADO:
// registra el envío sin mandarlo. Cambiar de proveedor = agregar una clase acá,
// sin tocar la lógica de campañas.

import type { CategoriaPlantilla, Cliente } from "./types";
import { getSupabase, MODO_DEMO } from "./supabase/client";

export interface ResultadoEnvio {
  estado: "enviado" | "error";
  detalle: string;
}

export interface EnviadorWhatsApp {
  nombre: string;
  esSimulado: boolean;
  enviar(telefono: string, mensaje: string, empresaId: string): Promise<ResultadoEnvio>;
}

class ProveedorSimulado implements EnviadorWhatsApp {
  nombre = "Simulado (sin BSP configurado)";
  esSimulado = true;
  async enviar(): Promise<ResultadoEnvio> {
    return { estado: "enviado", detalle: "SIMULADO — no se envió (BSP pendiente de definir)" };
  }
}

/**
 * Twilio: el navegador NUNCA ve las credenciales. Llama a la ruta interna
 * /api/whatsapp/enviar con el token de sesión; el servidor valida rol y envía.
 */
class ProveedorTwilio implements EnviadorWhatsApp {
  nombre = "Twilio (WhatsApp Business)";
  esSimulado = false;
  async enviar(telefono: string, mensaje: string, empresaId: string): Promise<ResultadoEnvio> {
    try {
      const sesion = await getSupabase()?.auth.getSession();
      const jwt = sesion?.data.session?.access_token;
      if (!jwt) return { estado: "error", detalle: "Sin sesión activa para autorizar el envío." };
      const resp = await fetch("/api/whatsapp/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ telefono, mensaje, empresaId }),
      });
      const data = (await resp.json()) as ResultadoEnvio;
      return { estado: data.estado === "enviado" ? "enviado" : "error", detalle: data.detalle ?? `HTTP ${resp.status}` };
    } catch (e) {
      return { estado: "error", detalle: `Fallo de red: ${(e as Error).message}` };
    }
  }
}

/** Proveedor activo según NEXT_PUBLIC_WA_PROVIDER ("twilio" | vacío = simulado). */
export function getEnviador(): EnviadorWhatsApp {
  if (!MODO_DEMO && process.env.NEXT_PUBLIC_WA_PROVIDER === "twilio") {
    return new ProveedorTwilio();
  }
  return new ProveedorSimulado();
}

// Costo estimado por mensaje en ARS según categoría Meta (⚠️ A CONFIRMAR con el
// BSP elegido; Marketing es la más cara, Utility ~80% más barata).
export const COSTO_CATEGORIA: Record<CategoriaPlantilla, number> = {
  marketing: 70,
  utility: 15,
  authentication: 12,
};

export const CATEGORIA_LABEL: Record<CategoriaPlantilla, string> = {
  marketing: "Marketing (la más cara)",
  utility: "Utility (recordatorios/avisos — más barata)",
  authentication: "Authentication",
};

/**
 * Reemplaza las variables de la plantilla con los datos del cliente.
 * Si un dato falta, la variable se omite y se limpian los restos
 * ("(grupo /)", dobles espacios) para que el mensaje no salga roto.
 */
export function renderPlantilla(cuerpo: string, c: Cliente): string {
  const primerNombre = c.nombreCompleto.split(" ").slice(-1)[0] || c.nombreCompleto;
  return cuerpo
    .replace(/\{\{\s*nombre\s*\}\}/gi, c.nombreCompleto)
    .replace(/\{\{\s*primer_nombre\s*\}\}/gi, primerNombre)
    .replace(/\{\{\s*modelo\s*\}\}/gi, c.solicitud.modelo ?? "")
    .replace(/\{\{\s*grupo\s*\}\}/gi, c.solicitud.grupo ?? "")
    .replace(/\{\{\s*orden\s*\}\}/gi, c.solicitud.orden ?? "")
    .replace(/\(\s*grupo\s*\/\s*\)/gi, "") // "(grupo /)" cuando no hay grupo/orden
    .replace(/\(\s*\/\s*\)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([.,!?)])/g, "$1")
    .trim();
}

export const VARIABLES_AYUDA = "{{nombre}}, {{primer_nombre}}, {{modelo}}, {{grupo}}, {{orden}}";

/** Estado de configuración por empresa (para avisar en la UI qué empresa puede enviar). */
export async function estadoProveedor(empresaId: string): Promise<{ puedeEnviar: boolean; detalle: string }> {
  const enviador = getEnviador();
  if (enviador.esSimulado) return { puedeEnviar: true, detalle: "Proveedor simulado: registra sin enviar." };
  try {
    const resp = await fetch("/api/whatsapp/enviar", { method: "GET" });
    const data = (await resp.json()) as { proveedor: string; empresas: Record<string, boolean> };
    if (data.proveedor !== "twilio") return { puedeEnviar: false, detalle: "Twilio no está configurado en el servidor." };
    if (!data.empresas[empresaId]) {
      return { puedeEnviar: false, detalle: "Esta empresa todavía no tiene número emisor de WhatsApp configurado." };
    }
    return { puedeEnviar: true, detalle: "Twilio configurado para esta empresa." };
  } catch {
    return { puedeEnviar: false, detalle: "No se pudo verificar la configuración del proveedor." };
  }
}
