/**
 * wsfev1.ts
 * ---------
 * Cliente del WSFEv1 (Facturación Electrónica) de ARCA.
 *
 * Operaciones implementadas:
 *   - FEDummy               → health check del servicio.
 *   - FECompUltimoAutorizado→ último comprobante autorizado (para correlatividad).
 *   - FECAESolicitar        → solicita el CAE de una Factura C.
 *   - FEParamGet*           → tablas de referencia (tipos, condición IVA receptor).
 *
 * IMPORTANTE (Factura C / Monotributo):
 *   No se discrimina IVA. Se informa ImpTotal = ImpNeto, ImpIVA = 0 y NO se
 *   envía el array de alícuotas de IVA.
 */

import { config } from '../config.js';
import { logger } from '../logger.js';
import { getEndpoints, WSFEV1_NS } from './endpoints.js';
import { soapCall, extraerFault } from './soap.js';
import { obtenerTicketAcceso } from './wsaa.js';
import {
  ArcaBusinessError,
  CONCEPTO,
  type ObservacionArca,
  type ResultadoCAE,
  type SolicitudCAE,
  type TipoComprobante,
} from './types.js';

const endpoints = getEndpoints(config.env);

/** Arma el header de autenticación <Auth> que todas las operaciones requieren. */
async function authXml(): Promise<string> {
  const ta = await obtenerTicketAcceso('wsfe');
  return (
    '<ar:Auth>' +
    `<ar:Token>${ta.token}</ar:Token>` +
    `<ar:Sign>${ta.sign}</ar:Sign>` +
    `<ar:Cuit>${config.emisor.cuit}</ar:Cuit>` +
    '</ar:Auth>'
  );
}

/** Envuelve un cuerpo de operación en el sobre SOAP del WSFEv1. */
function envelope(inner: string): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="${WSFEV1_NS}">` +
    '<soapenv:Header/>' +
    `<soapenv:Body>${inner}</soapenv:Body>` +
    '</soapenv:Envelope>'
  );
}

function soapAction(op: string): string {
  return `${WSFEV1_NS}${op}`;
}

/** Normaliza Errors/Observaciones (pueden venir como objeto único o array). */
function normalizarObs(nodo: any): ObservacionArca[] {
  if (!nodo) return [];
  const arr = nodo.Err ?? nodo.Obs ?? nodo;
  const lista = Array.isArray(arr) ? arr : [arr];
  return lista
    .filter((e: any) => e && (e.Code !== undefined || e.Msg !== undefined))
    .map((e: any) => ({ code: e.Code, msg: String(e.Msg ?? '').trim() }));
}

/** Lanza ArcaBusinessError si el nodo Errors trae errores. */
function chequearErrores(result: any, contexto: string): void {
  const errores = normalizarObs(result?.Errors);
  if (errores.length > 0) {
    throw new ArcaBusinessError(
      `ARCA rechazó ${contexto}: ${errores.map((e) => `[${e.code}] ${e.msg}`).join(' | ')}`,
      errores,
    );
  }
}

// ---------------------------------------------------------------------------
//  FEDummy — estado del servicio
// ---------------------------------------------------------------------------
export interface EstadoServicio {
  appserver: string;
  dbserver: string;
  authserver: string;
}

export async function dummy(): Promise<EstadoServicio> {
  const body = await soapCall({
    url: endpoints.wsfev1,
    soapAction: soapAction('FEDummy'),
    envelope: envelope('<ar:FEDummy/>'),
  });
  const fault = extraerFault(body);
  if (fault) throw new ArcaBusinessError(`FEDummy: ${fault}`);

  const r = body?.FEDummyResponse?.FEDummyResult ?? {};
  return {
    appserver: String(r.AppServer ?? '?'),
    dbserver: String(r.DbServer ?? '?'),
    authserver: String(r.AuthServer ?? '?'),
  };
}

// ---------------------------------------------------------------------------
//  FECompUltimoAutorizado — último número autorizado (correlatividad)
// ---------------------------------------------------------------------------
export async function ultimoAutorizado(
  tipoComprobante: TipoComprobante,
  puntoVenta: number,
): Promise<number> {
  const inner =
    '<ar:FECompUltimoAutorizado>' +
    (await authXml()) +
    `<ar:PtoVta>${puntoVenta}</ar:PtoVta>` +
    `<ar:CbteTipo>${tipoComprobante}</ar:CbteTipo>` +
    '</ar:FECompUltimoAutorizado>';

  const body = await soapCall({
    url: endpoints.wsfev1,
    soapAction: soapAction('FECompUltimoAutorizado'),
    envelope: envelope(inner),
  });
  const fault = extraerFault(body);
  if (fault) throw new ArcaBusinessError(`FECompUltimoAutorizado: ${fault}`);

  const result = body?.FECompUltimoAutorizadoResponse?.FECompUltimoAutorizadoResult;
  chequearErrores(result, 'FECompUltimoAutorizado');

  return Number(result?.CbteNro ?? 0);
}

// ---------------------------------------------------------------------------
//  FECAESolicitar — solicita el CAE de una Factura C
// ---------------------------------------------------------------------------
export async function solicitarCAE(sol: SolicitudCAE): Promise<ResultadoCAE> {
  // El número siguiente lo calcula el orquestador (facturacion/), pero acá
  // aceptamos que venga ya resuelto. Consultamos el último para el CbteDesde.
  const ultimo = await ultimoAutorizado(sol.tipoComprobante, sol.puntoVenta);
  const numero = ultimo + 1;

  const moneda = sol.monedaId ?? 'PES';
  const cotiz = sol.cotizacion ?? 1;
  const importe = redondear2(sol.importeTotal);

  // Campos de servicios (concepto 2 o 3): período y vto. de pago obligatorios.
  const esServicio = sol.concepto === CONCEPTO.SERVICIOS || sol.concepto === CONCEPTO.PRODUCTOS_Y_SERVICIOS;
  let camposServicio = '';
  if (esServicio) {
    if (!sol.fechaServicioDesde || !sol.fechaServicioHasta || !sol.fechaVencimientoPago) {
      throw new ArcaBusinessError(
        'Concepto Servicios/Ambos requiere fechaServicioDesde, fechaServicioHasta y fechaVencimientoPago (YYYYMMDD).',
      );
    }
    camposServicio =
      `<ar:FchServDesde>${sol.fechaServicioDesde}</ar:FchServDesde>` +
      `<ar:FchServHasta>${sol.fechaServicioHasta}</ar:FchServHasta>` +
      `<ar:FchVtoPago>${sol.fechaVencimientoPago}</ar:FchVtoPago>`;
  }

  const detalle =
    '<ar:FECAEDetRequest>' +
    `<ar:Concepto>${sol.concepto}</ar:Concepto>` +
    `<ar:DocTipo>${sol.tipoDocReceptor}</ar:DocTipo>` +
    `<ar:DocNro>${sol.nroDocReceptor}</ar:DocNro>` +
    `<ar:CbteDesde>${numero}</ar:CbteDesde>` +
    `<ar:CbteHasta>${numero}</ar:CbteHasta>` +
    `<ar:CbteFch>${sol.fechaComprobante}</ar:CbteFch>` +
    // Factura C: todo el importe va en ImpNeto; sin IVA ni tributos.
    `<ar:ImpTotal>${importe}</ar:ImpTotal>` +
    `<ar:ImpTotConc>0</ar:ImpTotConc>` +
    `<ar:ImpNeto>${importe}</ar:ImpNeto>` +
    `<ar:ImpOpEx>0</ar:ImpOpEx>` +
    `<ar:ImpIVA>0</ar:ImpIVA>` +
    `<ar:ImpTrib>0</ar:ImpTrib>` +
    camposServicio +
    `<ar:MonId>${moneda}</ar:MonId>` +
    `<ar:MonCotiz>${cotiz}</ar:MonCotiz>` +
    // Obligatorio desde RG 5616.
    `<ar:CondicionIVAReceptorId>${sol.condicionIvaReceptorId}</ar:CondicionIVAReceptorId>` +
    '</ar:FECAEDetRequest>';

  const inner =
    '<ar:FECAESolicitar>' +
    (await authXml()) +
    '<ar:FeCAEReq>' +
    '<ar:FeCabReq>' +
    '<ar:CantReg>1</ar:CantReg>' +
    `<ar:PtoVta>${sol.puntoVenta}</ar:PtoVta>` +
    `<ar:CbteTipo>${sol.tipoComprobante}</ar:CbteTipo>` +
    '</ar:FeCabReq>' +
    `<ar:FeDetReq>${detalle}</ar:FeDetReq>` +
    '</ar:FeCAEReq>' +
    '</ar:FECAESolicitar>';

  logger.emision('FECAESolicitar request', {
    ambiente: config.env,
    tipoComprobante: sol.tipoComprobante,
    puntoVenta: sol.puntoVenta,
    numero,
    docReceptor: `${sol.tipoDocReceptor}/${sol.nroDocReceptor}`,
    importeTotal: importe,
  });

  const body = await soapCall({
    url: endpoints.wsfev1,
    soapAction: soapAction('FECAESolicitar'),
    envelope: envelope(inner),
  });

  const fault = extraerFault(body);
  if (fault) throw new ArcaBusinessError(`FECAESolicitar: ${fault}`);

  const result = body?.FECAESolicitarResponse?.FECAESolicitarResult;
  // Errores a nivel general (auth, estructura) → negocio, no reintentar.
  chequearErrores(result, 'FECAESolicitar');

  const det = result?.FeDetResp?.FECAEDetResponse;
  const detResp = Array.isArray(det) ? det[0] : det;

  const resultadoGlobal = String(result?.FeCabResp?.Resultado ?? detResp?.Resultado ?? 'R') as
    | 'A'
    | 'R'
    | 'P';

  const observaciones = normalizarObs(detResp?.Observaciones);
  const salida: ResultadoCAE = {
    resultado: resultadoGlobal,
    cae: detResp?.CAE ? String(detResp.CAE) : null,
    caeFechaVencimiento: detResp?.CAEFchVto ? String(detResp.CAEFchVto) : null,
    numeroComprobante: numero,
    observaciones,
    errores: [],
  };

  logger.emision('FECAESolicitar response', salida);

  // Rechazo: es decisión de negocio de ARCA → NO reintentar; informamos.
  if (salida.resultado !== 'A' || !salida.cae) {
    const detalleObs = observaciones.map((o) => `[${o.code}] ${o.msg}`).join(' | ');
    throw new ArcaBusinessError(
      `ARCA no aprobó el comprobante (resultado ${salida.resultado}). ${detalleObs}`,
      observaciones,
    );
  }

  return salida;
}

// ---------------------------------------------------------------------------
//  FEParamGet* — tablas de referencia
// ---------------------------------------------------------------------------
async function paramGet(op: string): Promise<any> {
  const inner = `<ar:${op}>${await authXml()}</ar:${op}>`;
  const body = await soapCall({
    url: endpoints.wsfev1,
    soapAction: soapAction(op),
    envelope: envelope(inner),
  });
  const fault = extraerFault(body);
  if (fault) throw new ArcaBusinessError(`${op}: ${fault}`);
  const result = body?.[`${op}Response`]?.[`${op}Result`];
  chequearErrores(result, op);
  return result;
}

export interface ParamItem {
  id: string | number;
  desc: string;
}

export async function tiposComprobante(): Promise<ParamItem[]> {
  const r = await paramGet('FEParamGetTiposCbte');
  return mapParam(r?.ResultGet?.CbteTipo, 'Id', 'Desc');
}

export async function tiposDocumento(): Promise<ParamItem[]> {
  const r = await paramGet('FEParamGetTiposDoc');
  return mapParam(r?.ResultGet?.DocTipo, 'Id', 'Desc');
}

export async function condicionesIvaReceptor(): Promise<ParamItem[]> {
  // Devuelve las condiciones válidas de IVA del receptor (RG 5616).
  const r = await paramGet('FEParamGetCondicionIvaReceptor');
  return mapParam(r?.ResultGet?.CondicionIvaReceptor, 'Id', 'Desc');
}

function mapParam(nodo: any, idKey: string, descKey: string): ParamItem[] {
  if (!nodo) return [];
  const arr = Array.isArray(nodo) ? nodo : [nodo];
  return arr.map((x: any) => ({ id: x[idKey], desc: String(x[descKey] ?? '').trim() }));
}

function redondear2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
