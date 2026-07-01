/**
 * schema.ts
 * ---------
 * DDL de la base SQLite. Se ejecuta al arrancar (idempotente: IF NOT EXISTS).
 */

export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Libreta de clientes frecuentes -------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  razon_social       TEXT    NOT NULL,
  doc_tipo           INTEGER NOT NULL,        -- 80 CUIT, 96 DNI, 99 Cons. Final
  doc_nro            TEXT    NOT NULL DEFAULT '0',
  condicion_iva_id   INTEGER NOT NULL,        -- CondicionIVAReceptorId (RG 5616)
  email              TEXT    NOT NULL DEFAULT '',
  concepto           INTEGER NOT NULL DEFAULT 1, -- 1 prod, 2 serv, 3 ambos
  activo             INTEGER NOT NULL DEFAULT 1,
  created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Ítems habituales por cliente (lista de precios) --------------------------
CREATE TABLE IF NOT EXISTS items (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id         INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  descripcion        TEXT    NOT NULL,
  cantidad           REAL    NOT NULL DEFAULT 1,
  precio_unitario    REAL    NOT NULL DEFAULT 0,   -- precio ACTUAL en la libreta
  activo             INTEGER NOT NULL DEFAULT 1,
  orden              INTEGER NOT NULL DEFAULT 0,
  updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_items_cliente ON items(cliente_id);

-- Comprobantes emitidos (almacenamiento digital, requisito legal) -----------
CREATE TABLE IF NOT EXISTS comprobantes (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  ambiente           TEXT    NOT NULL,             -- homo | prod
  tipo               INTEGER NOT NULL,             -- 11/12/13
  punto_venta        INTEGER NOT NULL,
  numero             INTEGER NOT NULL,
  cliente_id         INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  razon_social       TEXT    NOT NULL,
  doc_tipo           INTEGER NOT NULL,
  doc_nro            TEXT    NOT NULL,
  condicion_iva_id   INTEGER NOT NULL,
  concepto           INTEGER NOT NULL,
  importe_total      REAL    NOT NULL,
  moneda             TEXT    NOT NULL DEFAULT 'PES',
  cotizacion         REAL    NOT NULL DEFAULT 1,
  fecha_comprobante  TEXT    NOT NULL,             -- YYYYMMDD
  fch_serv_desde     TEXT,
  fch_serv_hasta     TEXT,
  fch_vto_pago       TEXT,
  cae                TEXT,
  cae_vto            TEXT,                          -- YYYYMMDD
  resultado          TEXT    NOT NULL,             -- A/R/P/DRY
  qr_url             TEXT,
  pdf_path           TEXT,
  periodo            TEXT,                          -- etiqueta del lote (ej. 2026-07)
  created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(ambiente, tipo, punto_venta, numero)
);
CREATE INDEX IF NOT EXISTS idx_comp_periodo ON comprobantes(periodo);

CREATE TABLE IF NOT EXISTS comprobante_items (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  comprobante_id     INTEGER NOT NULL REFERENCES comprobantes(id) ON DELETE CASCADE,
  descripcion        TEXT    NOT NULL,
  cantidad           REAL    NOT NULL,
  precio_unitario    REAL    NOT NULL,
  subtotal           REAL    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_compitems_comp ON comprobante_items(comprobante_id);

-- Historial de ajustes de precios por inflación -----------------------------
CREATE TABLE IF NOT EXISTS ajustes (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha              TEXT    NOT NULL DEFAULT (datetime('now')),
  alcance            TEXT    NOT NULL,             -- global | seleccion
  redondeo           TEXT    NOT NULL,             -- peso/decena/centena/ninguno
  guardado_libreta   INTEGER NOT NULL,            -- 1 = actualizó la libreta
  descripcion        TEXT    NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS ajuste_detalle (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  ajuste_id          INTEGER NOT NULL REFERENCES ajustes(id) ON DELETE CASCADE,
  cliente_id         INTEGER,
  item_id            INTEGER,
  descripcion_item   TEXT    NOT NULL DEFAULT '',
  porcentaje         REAL    NOT NULL,
  precio_anterior    REAL    NOT NULL,
  precio_nuevo       REAL    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ajdet_ajuste ON ajuste_detalle(ajuste_id);

-- Registro de envíos de email ----------------------------------------------
CREATE TABLE IF NOT EXISTS envios_email (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  comprobante_id     INTEGER REFERENCES comprobantes(id) ON DELETE SET NULL,
  destinatario       TEXT    NOT NULL,
  asunto             TEXT    NOT NULL,
  estado             TEXT    NOT NULL DEFAULT 'pendiente', -- pendiente/enviado/error
  intentos           INTEGER NOT NULL DEFAULT 0,
  error_msg          TEXT,
  enviado_at         TEXT,
  created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_envios_comp ON envios_email(comprobante_id);
`;
