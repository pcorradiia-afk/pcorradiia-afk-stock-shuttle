/**
 * clientes.ts
 * -----------
 * Repositorio de la libreta de clientes frecuentes y sus ítems habituales.
 */

import { db } from './index.js';

export interface ItemLibreta {
  id?: number;
  cliente_id?: number;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  activo?: number;
  orden?: number;
}

export interface Cliente {
  id?: number;
  razon_social: string;
  doc_tipo: number;
  doc_nro: string;
  condicion_iva_id: number;
  email: string;
  concepto: number;
  activo?: number;
  items?: ItemLibreta[];
}

const selCliente = db.prepare('SELECT * FROM clientes WHERE id = ?');
const selItems = db.prepare('SELECT * FROM items WHERE cliente_id = ? ORDER BY orden, id');
const selClientes = db.prepare('SELECT * FROM clientes WHERE activo = 1 ORDER BY razon_social');

export function listarClientes(): Cliente[] {
  const clientes = selClientes.all() as Cliente[];
  for (const c of clientes) {
    c.items = selItems.all(c.id) as ItemLibreta[];
  }
  return clientes;
}

export function obtenerCliente(id: number): Cliente | null {
  const c = selCliente.get(id) as Cliente | undefined;
  if (!c) return null;
  c.items = selItems.all(id) as ItemLibreta[];
  return c;
}

const insCliente = db.prepare(`
  INSERT INTO clientes (razon_social, doc_tipo, doc_nro, condicion_iva_id, email, concepto, activo)
  VALUES (@razon_social, @doc_tipo, @doc_nro, @condicion_iva_id, @email, @concepto, 1)
`);
const insItem = db.prepare(`
  INSERT INTO items (cliente_id, descripcion, cantidad, precio_unitario, orden, activo)
  VALUES (@cliente_id, @descripcion, @cantidad, @precio_unitario, @orden, 1)
`);

/** Crea un cliente con sus ítems en una transacción. */
export const crearCliente = db.transaction((c: Cliente): number => {
  const info = insCliente.run({
    razon_social: c.razon_social,
    doc_tipo: c.doc_tipo,
    doc_nro: c.doc_nro,
    condicion_iva_id: c.condicion_iva_id,
    email: c.email,
    concepto: c.concepto ?? 1,
  });
  const clienteId = Number(info.lastInsertRowid);
  (c.items ?? []).forEach((it, idx) =>
    insItem.run({
      cliente_id: clienteId,
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      precio_unitario: it.precio_unitario,
      orden: it.orden ?? idx,
    }),
  );
  return clienteId;
});

const updCliente = db.prepare(`
  UPDATE clientes SET
    razon_social = @razon_social, doc_tipo = @doc_tipo, doc_nro = @doc_nro,
    condicion_iva_id = @condicion_iva_id, email = @email, concepto = @concepto,
    updated_at = datetime('now')
  WHERE id = @id
`);
const delItemsDeCliente = db.prepare('DELETE FROM items WHERE cliente_id = ?');

/** Actualiza un cliente y reemplaza su lista de ítems. */
export const actualizarCliente = db.transaction((id: number, c: Cliente): void => {
  updCliente.run({
    id,
    razon_social: c.razon_social,
    doc_tipo: c.doc_tipo,
    doc_nro: c.doc_nro,
    condicion_iva_id: c.condicion_iva_id,
    email: c.email,
    concepto: c.concepto ?? 1,
  });
  delItemsDeCliente.run(id);
  (c.items ?? []).forEach((it, idx) =>
    insItem.run({
      cliente_id: id,
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      precio_unitario: it.precio_unitario,
      orden: it.orden ?? idx,
    }),
  );
});

const bajaCliente = db.prepare("UPDATE clientes SET activo = 0, updated_at = datetime('now') WHERE id = ?");
export function eliminarCliente(id: number): void {
  bajaCliente.run(id); // baja lógica (conserva historial de comprobantes)
}

/** Actualiza SOLO el precio de un ítem (usado al confirmar ajustes en libreta). */
const updPrecioItem = db.prepare(
  "UPDATE items SET precio_unitario = ?, updated_at = datetime('now') WHERE id = ?",
);
export function actualizarPrecioItem(itemId: number, precio: number): void {
  updPrecioItem.run(precio, itemId);
}
