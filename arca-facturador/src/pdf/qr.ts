/**
 * qr.ts
 * -----
 * Construye el código QR de la factura en el formato exigido por ARCA.
 *
 * ARCA define una URL: https://www.afip.gob.ar/fe/qr/?p=<datos>
 * donde <datos> es el JSON del comprobante codificado en Base64.
 * Campos del JSON (RG 4291): ver, fecha, cuit, ptoVta, tipoCmp, nroCmp,
 * importe, moneda, ctz, tipoDocRec, nroDocRec, tipoCodAut, codAut.
 */

import QRCode from 'qrcode';
import { getEndpoints } from '../arca/endpoints.js';

export interface DatosQR {
  fecha: string; // YYYY-MM-DD
  cuit: number; // CUIT del emisor
  ptoVta: number;
  tipoCmp: number; // 11/12/13
  nroCmp: number;
  importe: number;
  moneda: string; // PES
  ctz: number;
  tipoDocRec: number;
  nroDocRec: number;
  codAut: number; // CAE (numérico)
}

/** Devuelve la URL completa del QR según el ambiente. */
export function construirUrlQR(datos: DatosQR, env: 'homo' | 'prod'): string {
  const payload = {
    ver: 1,
    fecha: datos.fecha,
    cuit: datos.cuit,
    ptoVta: datos.ptoVta,
    tipoCmp: datos.tipoCmp,
    nroCmp: datos.nroCmp,
    importe: datos.importe,
    moneda: datos.moneda,
    ctz: datos.ctz,
    tipoDocRec: datos.tipoDocRec,
    nroDocRec: datos.nroDocRec,
    tipoCodAut: 'E', // 'E' = CAE
    codAut: datos.codAut,
  };

  const base64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
  return `${getEndpoints(env).qrBase}?p=${base64}`;
}

/** Genera el QR como Data URL (PNG) para incrustar en el PDF. */
export async function generarQRDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 1, width: 220 });
}
