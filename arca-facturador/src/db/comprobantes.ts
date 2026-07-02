/**
 * comprobantes.ts
 * ---------------
 * Repositorio de comprobantes emitidos (almacenamiento digital, requisito legal)
 * y del registro de envíos de email.
 */

import { db } from './index.js';

export interface ComprobanteRow {
  id?: number;
  ambiente: string;
  tipo: number;
  punto_venta: number;
  numero: number;
  cliente_id: number | null;
  razon_social: string;
  doc_tipo: number;
  doc_nro: string;
  condicion_iva_id: number;
  concepto: number;
  importe_total: number;
  moneda: string;
  cotizacion: number;
  fecha_comprobante: string;
  fch_serv_desde: string | null;
  fch_serv_hasta: string | null;
  fch_vto_pago: string | null;
  cae: string | null;
  cae_vto: string | null;
  resultado: string;
  qr_url: string | null;
  pdf_path: string | null;
  periodo: string | null;
}

export interface ComprobanteItemRow {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

const insComp = db.prepare(`
  INSERT INTO comprobantes (
    ambiente, tipo, punto_venta, numero, cliente_id, razon_social, doc_tipo, doc_nro,
    condicion_iva_id, concepto, importe_total, moneda, cotizacion, fecha_comprobante,
    fch_serv_desde, fch_serv_hasta, fch_vto_pago, cae, cae_vto, resultado, qr_url, pdf_path, periodo
  ) VALUES (
    @ambiente, @tipo, @punto_venta, @numero, @cliente_id, @razon_social, @doc_tipo, @doc_nro,
    @condicion_iva_id, @concepto, @importe_total, @moneda, @cotizacion, @fecha_comprobante,
    @fch_serv_desde, @fch_serv_hasta, @fch_vto_pago, @cae, @cae_vto, @resultado, @qr_url, @pdf_path, @periodo
  )
`);
const insCompItem = db.prepare(`
  INSERT INTO comprobante_items (comprobante_id, descripcion, cantidad, precio_unitario, subtotal)
  VALUES (?, ?, ?, ?, ?)
`);

export const guardarComprobante = db.transaction(
  (comp: ComprobanteRow, items: ComprobanteItemRow[]): number => {
    const info = insComp.run(comp);
    const id = Number(info.lastInsertRowid);
    for (const it of items) {
      insCompItem.run(id, it.descripcion, it.cantidad, it.precio_unitario, it.subtotal);
    }
    return id;
  },
);

const updPdf = db.prepare('UPDATE comprobantes SET pdf_path = ?, qr_url = ? WHERE id = ?');
export function setPdf(id: number, pdfPath: string, qrUrl: string): void {
  updPdf.run(pdfPath, qrUrl, id);
}

export function listarComprobantes(limit = 200): ComprobanteRow[] {
  return db
    .prepare('SELECT * FROM comprobantes ORDER BY id DESC LIMIT ?')
    .all(limit) as ComprobanteRow[];
}

export function obtenerComprobante(id: number): ComprobanteRow | null {
  return (db.prepare('SELECT * FROM comprobantes WHERE id = ?').get(id) as ComprobanteRow) ?? null;
}

export function itemsDeComprobante(id: number): ComprobanteItemRow[] {
  return db
    .prepare('SELECT descripcion, cantidad, precio_unitario, subtotal FROM comprobante_items WHERE comprobante_id = ?')
    .all(id) as ComprobanteItemRow[];
}

// --- Registro de envíos de email -------------------------------------------
const insEnvio = db.prepare(`
  INSERT INTO envios_email (comprobante_id, destinatario, asunto, estado, intentos)
  VALUES (?, ?, ?, 'pendiente', 0)
`);
export function crearEnvio(comprobanteId: number, destinatario: string, asunto: string): number {
  return Number(insEnvio.run(comprobanteId, destinatario, asunto).lastInsertRowid);
}

const updEnvioOk = db.prepare(
  "UPDATE envios_email SET estado='enviado', intentos=intentos+1, enviado_at=datetime('now'), error_msg=NULL WHERE id = ?",
);
const updEnvioError = db.prepare(
  "UPDATE envios_email SET estado='error', intentos=intentos+1, error_msg=? WHERE id = ?",
);
export function marcarEnvioOk(id: number): void {
  updEnvioOk.run(id);
}
export function marcarEnvioError(id: number, msg: string): void {
  updEnvioError.run(msg, id);
}

export function enviosFallidos(): any[] {
  return db.prepare("SELECT * FROM envios_email WHERE estado='error' ORDER BY id DESC").all();
}
