/**
 * types.ts
 * --------
 * Tipos del dominio ARCA/WSFEv1 y tablas de referencia para Factura C.
 */

/** Tipos de comprobante que emite un Monotributista (Factura C y sus notas). */
export const TIPO_COMPROBANTE = {
  FACTURA_C: 11,
  NOTA_DEBITO_C: 12,
  NOTA_CREDITO_C: 13,
} as const;

export type TipoComprobante = (typeof TIPO_COMPROBANTE)[keyof typeof TIPO_COMPROBANTE];

/**
 * Concepto del comprobante.
 *  1 = Productos
 *  2 = Servicios       (requiere período facturado y fecha de vto. de pago)
 *  3 = Productos y Servicios
 */
export const CONCEPTO = {
  PRODUCTOS: 1,
  SERVICIOS: 2,
  PRODUCTOS_Y_SERVICIOS: 3,
} as const;

export type Concepto = (typeof CONCEPTO)[keyof typeof CONCEPTO];

/** Tipos de documento del receptor. */
export const TIPO_DOC = {
  CUIT: 80,
  CUIL: 86,
  DNI: 96,
  /** Consumidor final sin identificar (DocNro = 0). */
  CONSUMIDOR_FINAL: 99,
} as const;

export type TipoDoc = (typeof TIPO_DOC)[keyof typeof TIPO_DOC];

/**
 * Condición de IVA del receptor (campo CondicionIVAReceptorId, obligatorio
 * desde RG 5616). Los IDs los devuelve FEParamGetCondicionIvaReceptor; estos
 * son los valores estándar más usados. Si ARCA cambia la tabla, consultá el
 * endpoint de parámetros.
 */
export const CONDICION_IVA_RECEPTOR = {
  IVA_RESPONSABLE_INSCRIPTO: 1,
  IVA_SUJETO_EXENTO: 4,
  CONSUMIDOR_FINAL: 5,
  RESPONSABLE_MONOTRIBUTO: 6,
  SUJETO_NO_CATEGORIZADO: 7,
  PROVEEDOR_EXTERIOR: 8,
  CLIENTE_EXTERIOR: 9,
  IVA_LIBERADO_LEY_19640: 10,
  MONOTRIBUTISTA_SOCIAL: 13,
  MONOTRIBUTISTA_TRABAJADOR_INDEPENDIENTE: 15,
} as const;

export type CondicionIvaReceptorId =
  (typeof CONDICION_IVA_RECEPTOR)[keyof typeof CONDICION_IVA_RECEPTOR];

/** Ticket de Acceso devuelto por WSAA. */
export interface TicketAcceso {
  token: string;
  sign: string;
  /** ISO string de expiración (el TA dura ~12 hs). */
  expiration: string;
  /** Servicio para el que fue emitido (ej. "wsfe"). */
  service: string;
}

/** Datos necesarios para solicitar un CAE (una línea de comprobante). */
export interface SolicitudCAE {
  tipoComprobante: TipoComprobante;
  puntoVenta: number;
  concepto: Concepto;
  tipoDocReceptor: TipoDoc;
  nroDocReceptor: number;
  condicionIvaReceptorId: CondicionIvaReceptorId;
  /** Importe total del comprobante (sin discriminar IVA en Factura C). */
  importeTotal: number;
  /** Fecha del comprobante en formato YYYYMMDD. */
  fechaComprobante: string;
  /** Moneda (PES por defecto). */
  monedaId?: string;
  cotizacion?: number;
  /** Solo para servicios (concepto 2 o 3), en YYYYMMDD. */
  fechaServicioDesde?: string;
  fechaServicioHasta?: string;
  fechaVencimientoPago?: string;
}

/** Resultado de FECAESolicitar. */
export interface ResultadoCAE {
  resultado: 'A' | 'R' | 'P'; // Aprobado / Rechazado / Parcial
  cae: string | null;
  caeFechaVencimiento: string | null; // YYYYMMDD
  numeroComprobante: number;
  observaciones: ObservacionArca[];
  errores: ObservacionArca[];
}

export interface ObservacionArca {
  code: number | string;
  msg: string;
}

/** Error de negocio de ARCA: NO se debe reintentar. */
export class ArcaBusinessError extends Error {
  constructor(
    message: string,
    public readonly detalles: ObservacionArca[] = [],
  ) {
    super(message);
    this.name = 'ArcaBusinessError';
  }
}

/** Error transitorio (red / servicio caído): SÍ se puede reintentar. */
export class ArcaTransientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArcaTransientError';
  }
}
