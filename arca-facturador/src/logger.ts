/**
 * logger.ts
 * ---------
 * Logging simple con timestamp y nivel. Escribe a consola y, para eventos de
 * emisión, también a un archivo diario en data/logs/ (requisito de trazabilidad).
 */

import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

type Nivel = 'debug' | 'info' | 'warn' | 'error';

const iconos: Record<Nivel, string> = {
  debug: '·',
  info: 'ℹ',
  warn: '⚠',
  error: '✖',
};

function ts(): string {
  return new Date().toISOString();
}

function ensureLogsDir(): void {
  if (!fs.existsSync(config.paths.logsDir)) {
    fs.mkdirSync(config.paths.logsDir, { recursive: true });
  }
}

function escribirArchivo(linea: string): void {
  try {
    ensureLogsDir();
    const dia = ts().slice(0, 10); // YYYY-MM-DD
    const archivo = path.join(config.paths.logsDir, `facturador-${dia}.log`);
    fs.appendFileSync(archivo, linea + '\n', 'utf8');
  } catch {
    // No frenamos la app por un fallo de logging a disco.
  }
}

function log(nivel: Nivel, msg: string, extra?: unknown): void {
  const base = `${ts()} ${iconos[nivel]} [${nivel.toUpperCase()}] ${msg}`;
  const linea = extra !== undefined ? `${base} ${safeStringify(extra)}` : base;

  if (nivel === 'error') console.error(linea);
  else if (nivel === 'warn') console.warn(linea);
  else console.log(linea);

  // Persistimos warn/error y todo lo marcado como emisión.
  if (nivel === 'warn' || nivel === 'error') escribirArchivo(linea);
}

function safeStringify(v: unknown): string {
  try {
    return typeof v === 'string' ? v : JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export const logger = {
  debug: (m: string, e?: unknown) => log('debug', m, e),
  info: (m: string, e?: unknown) => log('info', m, e),
  warn: (m: string, e?: unknown) => log('warn', m, e),
  error: (m: string, e?: unknown) => log('error', m, e),

  /**
   * Traza específica de una emisión: siempre va a archivo (requisito legal de
   * dejar registro de request, CAE y resultado).
   */
  emision: (msg: string, datos: unknown) => {
    const linea = `${ts()} 🧾 [EMISION] ${msg} ${safeStringify(datos)}`;
    console.log(linea);
    escribirArchivo(linea);
  },
};
