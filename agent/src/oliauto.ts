import path from "node:path";
import { mkdirSync } from "node:fs";
import type { Page } from "playwright";
import type { TipoImportacion } from "../../src/lib/importCompute";
import type { Config } from "./config";

// ===========================================================================
//  Navegación a Oliauto.
//
//  ⚠️ ESTA ES LA ÚNICA PARTE QUE DEPENDE DE CÓMO ES LA PANTALLA DE OLIAUTO.
//  El login ya está implementado (selectores configurables por .env). Para la
//  descarga de cada reporte hay que confirmar la URL/menú y el botón de export
//  reales — están marcados con TODO y se pueden setear por variables de entorno
//  sin tocar el código (ver agent/README.md).
// ===========================================================================

/** Inicia sesión en Oliauto (usuario + contraseña). */
export async function login(page: Page, cfg: Config): Promise<void> {
  await page.goto(cfg.oliauto.url, { waitUntil: "networkidle" });
  await page.fill(cfg.oliauto.selUsuario, cfg.oliauto.usuario);
  await page.fill(cfg.oliauto.selPassword, cfg.oliauto.password);
  await page.click(cfg.oliauto.selSubmit);
  await page.waitForLoadState("networkidle");
}

interface NavReporte {
  /** URL directa del reporte (si Oliauto la tiene) o '' para navegar por menú. */
  url: string;
  /** Selector del botón/enlace que dispara la descarga del Excel. */
  disparar: string;
}

/** Configuración de navegación por reporte, sobreescribible por .env. */
function navDe(tipo: TipoImportacion): NavReporte {
  const up = tipo.toUpperCase();
  return {
    url: process.env[`OLIAUTO_URL_${up}`] ?? "",
    disparar: process.env[`OLIAUTO_EXPORT_${up}`] ?? process.env.OLIAUTO_SEL_EXPORT ?? "",
  };
}

/**
 * Navega al reporte indicado y descarga el Excel. Devuelve la ruta del archivo.
 *
 * TODO (con tu paso a paso de Oliauto): confirmar `url`/menú y el selector del
 * botón de exportar. Si Oliauto exporta con un click directo, esto ya funciona
 * seteando OLIAUTO_URL_<REPORTE> y OLIAUTO_EXPORT_<REPORTE>.
 */
export async function descargarReporte(
  page: Page,
  tipo: TipoImportacion,
  cfg: Config,
): Promise<string> {
  const nav = navDe(tipo);
  if (!nav.disparar) {
    throw new Error(
      `Falta configurar la descarga del reporte '${tipo}'. ` +
        `Definí OLIAUTO_EXPORT_${tipo.toUpperCase()} (y opcionalmente OLIAUTO_URL_${tipo.toUpperCase()}) ` +
        `con el selector del botón de exportar y la URL del reporte en Oliauto.`,
    );
  }

  if (nav.url) {
    await page.goto(nav.url, { waitUntil: "networkidle" });
  }
  // TODO: si el reporte requiere elegir fechas/sucursal antes de exportar,
  // agregar acá esos pasos (page.fill / page.selectOption) según la pantalla.

  mkdirSync(cfg.descargas, { recursive: true });
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click(nav.disparar),
  ]);

  const dest = path.join(cfg.descargas, `${tipo}-${Date.now()}.xls`);
  await download.saveAs(dest);
  return dest;
}
