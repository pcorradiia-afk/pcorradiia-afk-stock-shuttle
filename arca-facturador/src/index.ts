/**
 * index.ts
 * --------
 * Punto de entrada: levanta el servidor local del facturador.
 */

import { config } from './config.js';
import { logger } from './logger.js';
import { crearApp } from './server/app.js';
import './db/index.js'; // inicializa la base al arrancar

const app = crearApp();

app.listen(config.port, () => {
  const banner =
    config.env === 'prod'
      ? '🔴 PRODUCCIÓN — se emiten comprobantes REALES'
      : '🟢 HOMOLOGACIÓN — entorno de pruebas (sin validez fiscal)';
  logger.info('──────────────────────────────────────────────');
  logger.info(' ARCA Facturador (sistema personal)');
  logger.info(` Ambiente: ${banner}`);
  logger.info(` Emisor:   ${config.emisor.razonSocial} (CUIT ${config.emisor.cuit})`);
  logger.info(` Pto Vta:  ${config.emisor.puntoVenta}`);
  logger.info(` Web:      http://localhost:${config.port}`);
  logger.info('──────────────────────────────────────────────');
});
