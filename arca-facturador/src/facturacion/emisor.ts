/**
 * emisor.ts
 * ---------
 * Orquesta la emisión de un comprobante de punta a punta:
 *   1. Resuelve el receptor y calcula el importe total.
 *   2. Consulta el último autorizado (correlatividad sin saltos).
 *   3. Solicita el CAE a ARCA (o lo omite en dry-run).
 *   4. Genera el PDF con QR.
 *   5. Guarda el comprobante (almacenamiento digital) y sus ítems.
 *   6. Opcionalmente envía el email con el PDF adjunto.
 *
 * Manejo de errores:
 *   - ArcaTransientError (red/servicio): el reintento lo hace la capa SOAP.
 *   - ArcaBusinessError (rechazo de ARCA): se propaga SIN reintentar.
 */

import { config } from '../config.js';
import { logger } from '../logger.js';
import { obtenerCliente } from '../db/clientes.js';
import { guardarComprobante, setPdf, crearEnvio, marcarEnvioOk, marcarEnvioError } from '../db/comprobantes.js';
import { solicitarCAE, ultimoAutorizado } from '../arca/wsfev1.js';
import { generarFacturaPDF } from '../pdf/factura-pdf.js';
import { crearEmailProvider } from '../email/mailer.js';
import { asuntoEmail, cuerpoEmail } from '../email/templates.js';
import {
  CONCEPTO,
  TIPO_COMPROBANTE,
  type Concepto,
  type TipoComprobante,
  type SolicitudCAE,
} from '../arca/types.js';

/** Descripciones legibles de la condición de IVA del receptor (para el PDF). */
const DESC_CONDICION_IVA: Record<number, string> = {
  1: 'IVA Responsable Inscripto',
  4: 'IVA Sujeto Exento',
  5: 'Consumidor Final',
  6: 'Responsable Monotributo',
  7: 'Sujeto No Categorizado',
  8: 'Proveedor del Exterior',
  9: 'Cliente del Exterior',
  10: 'IVA Liberado – Ley 19.640',
  13: 'Monotributista Social',
  15: 'Monotributo Trabajador Independiente Promovido',
};

export interface ItemEmision {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
}

export interface EntradaEmision {
  clienteId: number;
  tipoComprobante?: TipoComprobante; // default Factura C
  concepto?: Concepto; // si no viene, se toma del cliente
  items: ItemEmision[];
  /** Fecha del comprobante YYYYMMDD; default hoy. */
  fechaComprobante?: string;
  /** Etiqueta del lote/período, ej. "2026-07". */
  periodo?: string;
  /** Para servicios (concepto 2/3): período facturado y vto. de pago (YYYYMMDD). */
  servicios?: { desde: string; hasta: string; vtoPago: string };
  enviarEmail?: boolean;
}

export interface ResultadoEmision {
  ok: boolean;
  dryRun: boolean;
  comprobanteId?: number;
  tipoComprobante: number;
  puntoVenta: number;
  numero: number;
  cae: string | null;
  caeVto: string | null;
  importeTotal: number;
  pdfPath?: string;
  qrUrl?: string;
  emailEstado?: 'enviado' | 'error' | 'omitido';
  emailError?: string;
  error?: string;
}

function hoyYYYYMMDD(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Emite (o simula, si dryRun) un comprobante para un cliente.
 */
export async function emitirComprobante(
  entrada: EntradaEmision,
  opts: { dryRun: boolean },
): Promise<ResultadoEmision> {
  const dryRun = opts.dryRun;
  const cliente = obtenerCliente(entrada.clienteId);
  if (!cliente) throw new Error(`Cliente ${entrada.clienteId} no encontrado`);

  const tipo = entrada.tipoComprobante ?? TIPO_COMPROBANTE.FACTURA_C;
  const concepto = entrada.concepto ?? (cliente.concepto as Concepto) ?? CONCEPTO.PRODUCTOS;
  const fecha = entrada.fechaComprobante ?? hoyYYYYMMDD();
  const pv = config.emisor.puntoVenta;

  if (!entrada.items.length) throw new Error('El comprobante no tiene ítems');
  const items = entrada.items.map((it) => ({
    descripcion: it.descripcion,
    cantidad: it.cantidad,
    precioUnitario: it.precioUnitario,
    subtotal: round2(it.cantidad * it.precioUnitario),
  }));
  const importeTotal = round2(items.reduce((s, it) => s + it.subtotal, 0));

  const base: ResultadoEmision = {
    ok: false,
    dryRun,
    tipoComprobante: tipo,
    puntoVenta: pv,
    numero: 0,
    cae: null,
    caeVto: null,
    importeTotal,
  };

  // 1) Correlatividad: consultamos el último autorizado (operación de lectura).
  const ultimo = await ultimoAutorizado(tipo, pv);
  const numeroPrevisto = ultimo + 1;

  let cae: string;
  let caeVto: string;
  let numero: number;

  if (dryRun) {
    logger.info(
      `🧪 DRY-RUN: se emitiría ${nombreTipo(tipo)} Nº ${pad(pv, 5)}-${pad(numeroPrevisto, 8)} ` +
        `para ${cliente.razon_social} por $ ${importeTotal.toFixed(2)} (NO se solicita CAE)`,
    );
    numero = numeroPrevisto;
    cae = 'DRY-RUN';
    caeVto = fecha;
  } else {
    // 2) Solicitud real de CAE. Si ARCA rechaza → ArcaBusinessError (no reintentar).
    const sol: SolicitudCAE = {
      tipoComprobante: tipo,
      puntoVenta: pv,
      concepto,
      tipoDocReceptor: cliente.doc_tipo as SolicitudCAE['tipoDocReceptor'],
      nroDocReceptor: Number(cliente.doc_nro || 0),
      condicionIvaReceptorId: cliente.condicion_iva_id as SolicitudCAE['condicionIvaReceptorId'],
      importeTotal,
      fechaComprobante: fecha,
      monedaId: 'PES',
      cotizacion: 1,
    };
    if (concepto !== CONCEPTO.PRODUCTOS) {
      if (!entrada.servicios) {
        throw new Error('Concepto Servicios/Ambos requiere período y vencimiento de pago (servicios).');
      }
      sol.fechaServicioDesde = entrada.servicios.desde;
      sol.fechaServicioHasta = entrada.servicios.hasta;
      sol.fechaVencimientoPago = entrada.servicios.vtoPago;
    }

    const res = await solicitarCAE(sol);
    numero = res.numeroComprobante;
    cae = res.cae!;
    caeVto = res.caeFechaVencimiento!;
  }

  // 3) PDF con QR.
  const { pdfPath, qrUrl } = await generarFacturaPDF({
    tipoComprobante: tipo,
    puntoVenta: pv,
    numero,
    fechaComprobante: fecha,
    concepto,
    periodoDesde: entrada.servicios?.desde,
    periodoHasta: entrada.servicios?.hasta,
    vencimientoPago: entrada.servicios?.vtoPago,
    receptor: {
      razonSocial: cliente.razon_social,
      docTipo: cliente.doc_tipo,
      docNro: cliente.doc_nro,
      condicionIvaDesc: DESC_CONDICION_IVA[cliente.condicion_iva_id] ?? `Cond. IVA ${cliente.condicion_iva_id}`,
    },
    items,
    importeTotal,
    moneda: 'PES',
    cotizacion: 1,
    cae,
    caeVto,
  });

  // 4) Guardado del comprobante (siempre, incluso dry-run, marcado como DRY).
  const comprobanteId = guardarComprobante(
    {
      ambiente: config.env,
      tipo,
      punto_venta: pv,
      numero,
      cliente_id: cliente.id ?? null,
      razon_social: cliente.razon_social,
      doc_tipo: cliente.doc_tipo,
      doc_nro: cliente.doc_nro,
      condicion_iva_id: cliente.condicion_iva_id,
      concepto,
      importe_total: importeTotal,
      moneda: 'PES',
      cotizacion: 1,
      fecha_comprobante: fecha,
      fch_serv_desde: entrada.servicios?.desde ?? null,
      fch_serv_hasta: entrada.servicios?.hasta ?? null,
      fch_vto_pago: entrada.servicios?.vtoPago ?? null,
      cae: dryRun ? null : cae,
      cae_vto: dryRun ? null : caeVto,
      resultado: dryRun ? 'DRY' : 'A',
      qr_url: qrUrl,
      pdf_path: pdfPath,
      periodo: entrada.periodo ?? null,
    },
    items.map((it) => ({
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      precio_unitario: it.precioUnitario,
      subtotal: it.subtotal,
    })),
  );
  setPdf(comprobanteId, pdfPath, qrUrl);

  const resultado: ResultadoEmision = {
    ...base,
    ok: true,
    comprobanteId,
    numero,
    cae: dryRun ? null : cae,
    caeVto: dryRun ? null : caeVto,
    pdfPath,
    qrUrl,
  };

  // 5) Email (opcional). En dry-run el provider "log" no manda nada real igual.
  if (entrada.enviarEmail) {
    resultado.emailEstado = await enviarEmailComprobante({
      comprobanteId,
      email: cliente.email,
      cliente: cliente.razon_social,
      periodo: entrada.periodo ?? fecha,
      tipoNombre: nombreTipo(tipo),
      numeroFmt: `${pad(pv, 5)}-${pad(numero, 8)}`,
      fecha,
      total: importeTotal,
      cae: dryRun ? 'DRY-RUN' : cae,
      caeVto: dryRun ? '-' : caeVto,
      pdfPath,
    }).then(
      () => 'enviado' as const,
      (e) => {
        resultado.emailError = e instanceof Error ? e.message : String(e);
        return 'error' as const;
      },
    );
  } else {
    resultado.emailEstado = 'omitido';
  }

  logger.emision('Comprobante procesado', resultado);
  return resultado;
}

interface EnvioComprobante {
  comprobanteId: number;
  email: string;
  cliente: string;
  periodo: string;
  tipoNombre: string;
  numeroFmt: string;
  fecha: string;
  total: number;
  cae: string;
  caeVto: string;
  pdfPath: string;
}

async function enviarEmailComprobante(e: EnvioComprobante): Promise<void> {
  if (!e.email) throw new Error('El cliente no tiene email cargado');

  const datosTpl = {
    cliente: e.cliente,
    periodo: e.periodo,
    tipo: e.tipoNombre,
    numero: e.numeroFmt,
    fecha: e.fecha,
    total: e.total.toLocaleString('es-AR', { minimumFractionDigits: 2 }),
    cae: e.cae,
    caeVto: e.caeVto,
  };
  const asunto = asuntoEmail(datosTpl);
  const envioId = crearEnvio(e.comprobanteId, e.email, asunto);

  try {
    const provider = crearEmailProvider();
    await provider.enviar({
      para: e.email,
      asunto,
      cuerpoHtml: cuerpoEmail(datosTpl),
      adjuntos: [{ filename: `${e.tipoNombre}_${e.numeroFmt}.pdf`, path: e.pdfPath, contentType: 'application/pdf' }],
    });
    marcarEnvioOk(envioId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    marcarEnvioError(envioId, msg);
    throw err;
  }
}

/** Emite un lote de comprobantes (uno por entrada). No corta ante un rechazo. */
export async function emitirLote(
  entradas: EntradaEmision[],
  opts: { dryRun: boolean },
): Promise<ResultadoEmision[]> {
  const resultados: ResultadoEmision[] = [];
  for (const entrada of entradas) {
    try {
      resultados.push(await emitirComprobante(entrada, opts));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Falló la emisión del cliente ${entrada.clienteId}: ${msg}`);
      resultados.push({
        ok: false,
        dryRun: opts.dryRun,
        tipoComprobante: entrada.tipoComprobante ?? TIPO_COMPROBANTE.FACTURA_C,
        puntoVenta: config.emisor.puntoVenta,
        numero: 0,
        cae: null,
        caeVto: null,
        importeTotal: 0,
        error: msg,
      });
    }
  }
  return resultados;
}

function nombreTipo(t: number): string {
  return t === TIPO_COMPROBANTE.NOTA_CREDITO_C
    ? 'Nota de Crédito C'
    : t === TIPO_COMPROBANTE.NOTA_DEBITO_C
      ? 'Nota de Débito C'
      : 'Factura C';
}
function pad(n: number, len: number): string {
  return String(n).padStart(len, '0');
}
