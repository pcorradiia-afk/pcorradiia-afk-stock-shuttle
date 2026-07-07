/**
 * precios.ts
 * ----------
 * Motor de ajuste de precios por inflación.
 *
 * Soporta dos modos:
 *   (a) global    → un mismo % a TODOS los ítems de la libreta.
 *   (b) seleccion → % distinto por selección de clientes y/o ítems puntuales.
 *
 * Siempre genera una vista previa "antes → después" y NO toca nada hasta que
 * se confirma. Al confirmar se puede:
 *   - guardar el precio nuevo en la libreta (acumulativo para el mes siguiente), o
 *   - aplicarlo solo a la factura de este mes (sin guardar).
 * En ambos casos queda registrado en el historial de ajustes.
 */

import { listarClientes, actualizarPrecioItem } from '../db/clientes.js';
import { registrarAjuste, type AjusteDetalle } from '../db/ajustes.js';

export type ModoRedondeo = 'peso' | 'decena' | 'centena' | 'ninguno';

/** Redondea según el modo elegido. */
export function redondear(valor: number, modo: ModoRedondeo): number {
  switch (modo) {
    case 'peso':
      return Math.round(valor);
    case 'decena':
      return Math.round(valor / 10) * 10;
    case 'centena':
      return Math.round(valor / 100) * 100;
    case 'ninguno':
    default:
      return Math.round((valor + Number.EPSILON) * 100) / 100;
  }
}

/** Una selección con su propio porcentaje (modo seleccion). */
export interface SeleccionAjuste {
  /** IDs de clientes a los que aplica (todos sus ítems). */
  clienteIds?: number[];
  /** IDs de ítems puntuales a los que aplica. */
  itemIds?: number[];
  /** Porcentaje de aumento (ej. 15 = +15%). */
  porcentaje: number;
}

export interface EntradaAjuste {
  modo: 'global' | 'seleccion';
  /** Requerido si modo = global. */
  porcentajeGlobal?: number;
  /** Requerido si modo = seleccion. Se evalúan en orden; gana la primera que matchea. */
  selecciones?: SeleccionAjuste[];
  redondeo: ModoRedondeo;
}

export interface LineaPreview {
  cliente_id: number;
  cliente_nombre: string;
  item_id: number;
  descripcion: string;
  porcentaje: number;
  precio_anterior: number;
  precio_nuevo: number;
}

export interface PreviewAjuste {
  lineas: LineaPreview[];
  /** Resumen por cliente para mostrar en la UI. */
  porCliente: Array<{
    cliente_id: number;
    cliente_nombre: string;
    total_anterior: number;
    total_nuevo: number;
    lineas: LineaPreview[];
  }>;
  totalAnterior: number;
  totalNuevo: number;
}

/** Determina el % aplicable a un ítem según la entrada. */
function porcentajeParaItem(
  entrada: EntradaAjuste,
  clienteId: number,
  itemId: number,
): number {
  if (entrada.modo === 'global') return entrada.porcentajeGlobal ?? 0;

  for (const sel of entrada.selecciones ?? []) {
    const matchItem = sel.itemIds?.includes(itemId);
    const matchCliente = sel.clienteIds?.includes(clienteId);
    if (matchItem || matchCliente) return sel.porcentaje;
  }
  return 0; // no seleccionado → sin cambios
}

/**
 * Calcula la vista previa del ajuste sobre la libreta actual, sin modificar nada.
 */
export function calcularPreview(entrada: EntradaAjuste): PreviewAjuste {
  const clientes = listarClientes();
  const lineas: LineaPreview[] = [];

  for (const c of clientes) {
    for (const it of c.items ?? []) {
      if (!it.id) continue;
      const pct = porcentajeParaItem(entrada, c.id!, it.id);
      const anterior = it.precio_unitario;
      const nuevo = pct === 0 ? anterior : redondear(anterior * (1 + pct / 100), entrada.redondeo);
      lineas.push({
        cliente_id: c.id!,
        cliente_nombre: c.razon_social,
        item_id: it.id,
        descripcion: it.descripcion,
        porcentaje: pct,
        precio_anterior: anterior,
        precio_nuevo: nuevo,
      });
    }
  }

  // Agrupamos por cliente para la UI.
  const mapa = new Map<number, PreviewAjuste['porCliente'][number]>();
  for (const l of lineas) {
    let g = mapa.get(l.cliente_id);
    if (!g) {
      g = {
        cliente_id: l.cliente_id,
        cliente_nombre: l.cliente_nombre,
        total_anterior: 0,
        total_nuevo: 0,
        lineas: [],
      };
      mapa.set(l.cliente_id, g);
    }
    g.lineas.push(l);
    g.total_anterior += l.precio_anterior;
    g.total_nuevo += l.precio_nuevo;
  }

  const porCliente = [...mapa.values()];
  return {
    lineas,
    porCliente,
    totalAnterior: lineas.reduce((s, l) => s + l.precio_anterior, 0),
    totalNuevo: lineas.reduce((s, l) => s + l.precio_nuevo, 0),
  };
}

export interface ConfirmarAjuste {
  entrada: EntradaAjuste;
  /** true = guardar precios nuevos en la libreta (acumulativo). */
  guardarEnLibreta: boolean;
  descripcion?: string;
}

/**
 * Confirma un ajuste: registra el historial y, si corresponde, actualiza los
 * precios de la libreta. Devuelve el preview aplicado (solo líneas con cambio).
 */
export function confirmarAjuste(input: ConfirmarAjuste): { ajusteId: number; preview: PreviewAjuste } {
  const preview = calcularPreview(input.entrada);
  const cambiadas = preview.lineas.filter((l) => l.porcentaje !== 0 && l.precio_nuevo !== l.precio_anterior);

  if (input.guardarEnLibreta) {
    for (const l of cambiadas) {
      actualizarPrecioItem(l.item_id, l.precio_nuevo);
    }
  }

  const detalles: AjusteDetalle[] = cambiadas.map((l) => ({
    cliente_id: l.cliente_id,
    item_id: l.item_id,
    descripcion_item: `${l.cliente_nombre} · ${l.descripcion}`,
    porcentaje: l.porcentaje,
    precio_anterior: l.precio_anterior,
    precio_nuevo: l.precio_nuevo,
  }));

  const ajusteId = registrarAjuste(
    {
      alcance: input.entrada.modo,
      redondeo: input.entrada.redondeo,
      guardado_libreta: input.guardarEnLibreta ? 1 : 0,
      descripcion: input.descripcion ?? '',
    },
    detalles,
  );

  return { ajusteId, preview: { ...preview, lineas: cambiadas } };
}
