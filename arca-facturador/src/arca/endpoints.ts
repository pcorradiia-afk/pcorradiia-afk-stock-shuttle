/**
 * endpoints.ts
 * ------------
 * URLs de los web services de ARCA según ambiente.
 *
 *  - WSAA: autenticación (devuelve el Ticket de Acceso).
 *  - WSFEv1: facturación electrónica (CAE).
 *
 * Homologación = pruebas. Producción = real.
 */

export interface ArcaEndpoints {
  wsaa: string;
  wsfev1: string;
  /** URL base del validador de QR (igual en ambos ambientes). */
  qrBase: string;
}

const HOMO: ArcaEndpoints = {
  wsaa: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
  wsfev1: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
  qrBase: 'https://www.afip.gob.ar/fe/qr/',
};

const PROD: ArcaEndpoints = {
  wsaa: 'https://wsaa.afip.gov.ar/ws/services/LoginCms',
  wsfev1: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
  qrBase: 'https://www.afip.gob.ar/fe/qr/',
};

export function getEndpoints(env: 'homo' | 'prod'): ArcaEndpoints {
  return env === 'prod' ? PROD : HOMO;
}

/** Namespace SOAP del WSFEv1. */
export const WSFEV1_NS = 'http://ar.gov.afip.dif.FEV1/';
