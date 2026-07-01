/**
 * ajustes.ts
 * ----------
 * Repositorio del historial de ajustes de precios por inflación.
 */

import { db } from './index.js';

export interface AjusteDetalle {
  cliente_id: number | null;
  item_id: number | null;
  descripcion_item: string;
  porcentaje: number;
  precio_anterior: number;
  precio_nuevo: number;
}

const insAjuste = db.prepare(`
  INSERT INTO ajustes (alcance, redondeo, guardado_libreta, descripcion)
  VALUES (@alcance, @redondeo, @guardado_libreta, @descripcion)
`);
const insDetalle = db.prepare(`
  INSERT INTO ajuste_detalle (ajuste_id, cliente_id, item_id, descripcion_item, porcentaje, precio_anterior, precio_nuevo)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

export const registrarAjuste = db.transaction(
  (
    meta: { alcance: string; redondeo: string; guardado_libreta: number; descripcion: string },
    detalles: AjusteDetalle[],
  ): number => {
    const info = insAjuste.run(meta);
    const ajusteId = Number(info.lastInsertRowid);
    for (const d of detalles) {
      insDetalle.run(
        ajusteId,
        d.cliente_id,
        d.item_id,
        d.descripcion_item,
        d.porcentaje,
        d.precio_anterior,
        d.precio_nuevo,
      );
    }
    return ajusteId;
  },
);

export function listarAjustes(limit = 100): any[] {
  const ajustes = db.prepare('SELECT * FROM ajustes ORDER BY id DESC LIMIT ?').all(limit) as any[];
  const selDet = db.prepare('SELECT * FROM ajuste_detalle WHERE ajuste_id = ?');
  for (const a of ajustes) {
    a.detalle = selDet.all(a.id);
  }
  return ajustes;
}
