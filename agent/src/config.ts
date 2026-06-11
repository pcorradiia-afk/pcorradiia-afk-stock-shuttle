// Configuración del robot de sincronización. Todos los datos sensibles vienen
// de variables de entorno (secretos), nunca del código.
import "dotenv/config";

import type { TipoImportacion } from "../../src/lib/importCompute";

function requerido(nombre: string): string {
  const v = process.env[nombre];
  if (!v) throw new Error(`Falta la variable de entorno ${nombre}`);
  return v;
}

export interface Config {
  oliauto: {
    url: string;
    usuario: string;
    password: string;
    headless: boolean;
    /** Selectores del login (ajustables sin tocar código). */
    selUsuario: string;
    selPassword: string;
    selSubmit: string;
  };
  supabase: {
    url: string;
    serviceRoleKey: string;
  };
  /** Empresa a la que pertenecen los reportes de esta corrida. */
  empresaId: string;
  /** Reportes a sincronizar en esta corrida. */
  reportes: TipoImportacion[];
  /** Carpeta temporal donde se bajan los Excel. */
  descargas: string;
}

export function cargarConfig(): Config {
  const reportesEnv = process.env.OLIAUTO_REPORTES?.trim();
  const reportes = (reportesEnv
    ? reportesEnv.split(",").map((s) => s.trim())
    : ["balance_general", "balance_parcial", "composicion", "mayor"]) as TipoImportacion[];

  return {
    oliauto: {
      url: requerido("OLIAUTO_URL"),
      usuario: requerido("OLIAUTO_USER"),
      password: requerido("OLIAUTO_PASS"),
      headless: process.env.OLIAUTO_HEADLESS !== "false",
      selUsuario: process.env.OLIAUTO_SEL_USER ?? "#usuario",
      selPassword: process.env.OLIAUTO_SEL_PASS ?? "#password",
      selSubmit: process.env.OLIAUTO_SEL_SUBMIT ?? "button[type=submit]",
    },
    supabase: {
      url: requerido("SUPABASE_URL"),
      serviceRoleKey: requerido("SUPABASE_SERVICE_ROLE_KEY"),
    },
    empresaId: requerido("EMPRESA_ID"),
    reportes,
    descargas: process.env.DESCARGAS_DIR ?? "./descargas",
  };
}
