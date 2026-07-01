/**
 * app.ts
 * ------
 * Servidor Express que expone la API local y sirve el formulario web.
 * Corre en localhost: es un sistema PERSONAL, no se expone a internet.
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, PROJECT_ROOT } from '../config.js';
import { logger } from '../logger.js';
import { ArcaBusinessError } from '../arca/types.js';
import * as clientesRepo from '../db/clientes.js';
import * as compRepo from '../db/comprobantes.js';
import { listarAjustes } from '../db/ajustes.js';
import { calcularPreview, confirmarAjuste } from '../facturacion/precios.js';
import { emitirLote, type EntradaEmision } from '../facturacion/emisor.js';
import { dummy, condicionesIvaReceptor, tiposComprobante, tiposDocumento } from '../arca/wsfev1.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Envuelve un handler async y centraliza el manejo de errores. */
function h(fn: (req: Request, res: Response) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export function crearApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Formulario web estático.
  app.use(express.static(path.join(PROJECT_ROOT, 'public')));

  // --- Info de ambiente y estado ARCA -------------------------------------
  app.get(
    '/api/config',
    h(async (_req, res) => {
      res.json({
        ambiente: config.env,
        esProduccion: config.esProduccion,
        emisor: {
          razonSocial: config.emisor.razonSocial,
          cuit: config.emisor.cuit,
          puntoVenta: config.emisor.puntoVenta,
          condicionIva: config.emisor.condicionIva,
        },
        redondeoDefault: config.redondeoDefault,
        emailProvider: config.email.provider,
      });
    }),
  );

  app.get(
    '/api/estado',
    h(async (_req, res) => {
      const estado = await dummy();
      res.json({ ambiente: config.env, ...estado });
    }),
  );

  // Cache simple de parámetros de ARCA (cambian rara vez).
  let paramsCache: any = null;
  app.get(
    '/api/parametros',
    h(async (_req, res) => {
      if (!paramsCache) {
        const [tipos, condIva, tiposDoc] = await Promise.all([
          tiposComprobante().catch(() => []),
          condicionesIvaReceptor().catch(() => []),
          tiposDocumento().catch(() => []),
        ]);
        paramsCache = { tiposComprobante: tipos, condicionesIvaReceptor: condIva, tiposDoc };
      }
      res.json(paramsCache);
    }),
  );

  // --- Libreta de clientes -------------------------------------------------
  app.get('/api/clientes', h(async (_req, res) => res.json(clientesRepo.listarClientes())));
  app.get(
    '/api/clientes/:id',
    h(async (req, res) => {
      const c = clientesRepo.obtenerCliente(Number(req.params.id));
      if (!c) return res.status(404).json({ error: 'Cliente no encontrado' });
      res.json(c);
    }),
  );
  app.post(
    '/api/clientes',
    h(async (req, res) => {
      const id = clientesRepo.crearCliente(req.body);
      res.status(201).json({ id });
    }),
  );
  app.put(
    '/api/clientes/:id',
    h(async (req, res) => {
      clientesRepo.actualizarCliente(Number(req.params.id), req.body);
      res.json({ ok: true });
    }),
  );
  app.delete(
    '/api/clientes/:id',
    h(async (req, res) => {
      clientesRepo.eliminarCliente(Number(req.params.id));
      res.json({ ok: true });
    }),
  );

  // --- Ajustes de precios --------------------------------------------------
  app.post('/api/ajustes/preview', h(async (req, res) => res.json(calcularPreview(req.body))));
  app.post(
    '/api/ajustes/confirmar',
    h(async (req, res) => res.json(confirmarAjuste(req.body))),
  );
  app.get('/api/ajustes', h(async (_req, res) => res.json(listarAjustes())));

  // --- Emisión -------------------------------------------------------------
  app.post(
    '/api/emitir',
    h(async (req, res) => {
      const entradas: EntradaEmision[] = req.body.entradas ?? [];
      const dryRun: boolean = req.body.dryRun !== false; // default seguro: dry-run
      if (!entradas.length) return res.status(400).json({ error: 'No hay entradas para emitir' });
      const resultados = await emitirLote(entradas, { dryRun });
      res.json({ dryRun, ambiente: config.env, resultados });
    }),
  );

  // --- Comprobantes emitidos ----------------------------------------------
  app.get('/api/comprobantes', h(async (_req, res) => res.json(compRepo.listarComprobantes())));
  app.get(
    '/api/comprobantes/:id/pdf',
    h(async (req, res) => {
      const c = compRepo.obtenerComprobante(Number(req.params.id));
      if (!c?.pdf_path) return res.status(404).json({ error: 'PDF no disponible' });
      res.sendFile(path.resolve(c.pdf_path));
    }),
  );

  app.get('/api/envios/fallidos', h(async (_req, res) => res.json(compRepo.enviosFallidos())));

  // Manejo centralizado de errores.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ArcaBusinessError) {
      // Rechazo de negocio de ARCA: NO reintentar. 422.
      logger.warn(`Rechazo ARCA: ${err.message}`, err.detalles);
      return res.status(422).json({ error: err.message, detalles: err.detalles, tipo: 'negocio' });
    }
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Error interno: ${msg}`);
    res.status(500).json({ error: msg, tipo: 'interno' });
  });

  return app;
}
