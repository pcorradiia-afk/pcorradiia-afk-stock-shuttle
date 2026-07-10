"use client";

// Envío de WhatsApp (Fase 4). El sistema NO envía por su cuenta: se integra con
// un proveedor BSP (Twilio, 360dialog, Gupshup, WATI…) detrás de esta interfaz.
// Hasta que el cliente elija el BSP (CLAUDE.md Q6) se usa el PROVEEDOR SIMULADO:
// registra el envío sin mandarlo. Cambiar de proveedor = agregar una clase acá,
// sin tocar la lógica de campañas.

import type { CategoriaPlantilla, Cliente } from "./types";

export interface ResultadoEnvio {
  estado: "enviado" | "error";
  detalle: string;
}

export interface EnviadorWhatsApp {
  nombre: string;
  esSimulado: boolean;
  enviar(telefono: string, mensaje: string): Promise<ResultadoEnvio>;
}

class ProveedorSimulado implements EnviadorWhatsApp {
  nombre = "Simulado (sin BSP configurado)";
  esSimulado = true;
  async enviar(): Promise<ResultadoEnvio> {
    return { estado: "enviado", detalle: "SIMULADO — no se envió (BSP pendiente de definir)" };
  }
}

/** Proveedor activo. Cuando haya BSP: elegir acá según NEXT_PUBLIC_WA_PROVIDER. */
export function getEnviador(): EnviadorWhatsApp {
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

/** Reemplaza las variables de la plantilla con los datos del cliente. */
export function renderPlantilla(cuerpo: string, c: Cliente): string {
  const primerNombre = c.nombreCompleto.split(" ").slice(-1)[0] || c.nombreCompleto;
  return cuerpo
    .replace(/\{\{\s*nombre\s*\}\}/gi, c.nombreCompleto)
    .replace(/\{\{\s*primer_nombre\s*\}\}/gi, primerNombre)
    .replace(/\{\{\s*modelo\s*\}\}/gi, c.solicitud.modelo ?? "su plan")
    .replace(/\{\{\s*grupo\s*\}\}/gi, c.solicitud.grupo ?? "")
    .replace(/\{\{\s*orden\s*\}\}/gi, c.solicitud.orden ?? "");
}

export const VARIABLES_AYUDA = "{{nombre}}, {{primer_nombre}}, {{modelo}}, {{grupo}}, {{orden}}";
