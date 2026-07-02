/**
 * db/index.ts
 * -----------
 * Abre (y crea si hace falta) la base SQLite local y expone la conexión.
 * Es un sistema PERSONAL y autónomo: base propia por ambiente
 * (facturador-homo.db / facturador-prod.db), sin relación con otros sistemas.
 */

import Database from 'better-sqlite3';
import fs from 'node:fs';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { SCHEMA_SQL } from './schema.js';

// Aseguramos que exista la carpeta data/.
fs.mkdirSync(config.paths.dataDir, { recursive: true });

export const db = new Database(config.paths.dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Migración idempotente.
db.exec(SCHEMA_SQL);

logger.debug(`Base SQLite lista: ${config.paths.dbFile}`);
