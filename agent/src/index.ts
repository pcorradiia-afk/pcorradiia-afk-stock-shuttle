// Robot de sincronización Oliauto → Supabase.
// Inicia sesión, descarga los reportes configurados, los procesa con el mismo
// motor que la app y los guarda en la base. Pensado para correr por cron.

import { chromium } from "playwright";
import { cargarConfig } from "./config";
import { login, descargarReporte } from "./oliauto";
import { calcularDesdeArchivo } from "./importer";
import { crearCliente, upsertImportacion } from "./supabase";

async function main() {
  const cfg = cargarConfig();
  const sb = crearCliente(cfg);

  console.log(`[robot] Empresa ${cfg.empresaId} · reportes: ${cfg.reportes.join(", ")}`);

  const browser = await chromium.launch({ headless: cfg.oliauto.headless });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  const resultados: { tipo: string; ok: boolean; detalle: string }[] = [];

  try {
    console.log("[robot] Iniciando sesión en Oliauto…");
    await login(page, cfg);

    for (const tipo of cfg.reportes) {
      try {
        console.log(`[robot] Descargando '${tipo}'…`);
        const archivo = await descargarReporte(page, tipo, cfg);
        const calc = calcularDesdeArchivo(archivo, tipo);
        await upsertImportacion(sb, { empresa_id: cfg.empresaId, tipo, archivo, calc });
        const ref = calc.periodo ?? calc.corte ?? "";
        resultados.push({ tipo, ok: true, detalle: ref });
        console.log(`[robot] ✓ '${tipo}' guardado${ref ? ` (${ref})` : ""}`);
      } catch (e) {
        resultados.push({ tipo, ok: false, detalle: (e as Error).message });
        console.error(`[robot] ✗ '${tipo}': ${(e as Error).message}`);
      }
    }
  } finally {
    await browser.close();
  }

  const fallidos = resultados.filter((r) => !r.ok);
  console.log(`[robot] Listo. OK: ${resultados.length - fallidos.length} · Errores: ${fallidos.length}`);
  if (fallidos.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error("[robot] Error fatal:", e);
  process.exit(1);
});
