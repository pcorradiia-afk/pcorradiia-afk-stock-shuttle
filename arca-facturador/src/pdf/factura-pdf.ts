/**
 * factura-pdf.ts
 * --------------
 * Genera el PDF de la Factura C con el código QR de ARCA.
 * Layout inspirado en el modelo oficial: emisor arriba, letra "C" en el
 * recuadro central, datos del receptor, detalle de ítems, total, y al pie
 * el CAE con su vencimiento y el QR.
 */

import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { construirUrlQR, generarQRDataUrl, type DatosQR } from './qr.js';
import { TIPO_COMPROBANTE } from '../arca/types.js';

export interface DatosFacturaPDF {
  tipoComprobante: number;
  puntoVenta: number;
  numero: number;
  fechaComprobante: string; // YYYYMMDD
  concepto: number;
  periodoDesde?: string; // YYYYMMDD
  periodoHasta?: string;
  vencimientoPago?: string;
  receptor: {
    razonSocial: string;
    docTipo: number;
    docNro: string;
    condicionIvaDesc: string;
    domicilio?: string;
  };
  items: Array<{ descripcion: string; cantidad: number; precioUnitario: number; subtotal: number }>;
  importeTotal: number;
  moneda: string;
  cotizacion: number;
  cae: string;
  caeVto: string; // YYYYMMDD
}

const NOMBRE_TIPO: Record<number, { letra: string; nombre: string }> = {
  [TIPO_COMPROBANTE.FACTURA_C]: { letra: 'C', nombre: 'FACTURA' },
  [TIPO_COMPROBANTE.NOTA_DEBITO_C]: { letra: 'C', nombre: 'NOTA DE DÉBITO' },
  [TIPO_COMPROBANTE.NOTA_CREDITO_C]: { letra: 'C', nombre: 'NOTA DE CRÉDITO' },
};

function fmtFecha(yyyymmdd: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(6, 8)}/${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(0, 4)}`;
}
function isoFecha(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}
function money(n: number): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function nombreDoc(t: number): string {
  return t === 80 ? 'CUIT' : t === 96 ? 'DNI' : t === 86 ? 'CUIL' : 'Doc';
}

/**
 * Genera el PDF y lo guarda en data/comprobantes/. Devuelve { pdfPath, qrUrl }.
 */
export async function generarFacturaPDF(d: DatosFacturaPDF): Promise<{ pdfPath: string; qrUrl: string }> {
  fs.mkdirSync(config.paths.comprobantesDir, { recursive: true });

  const nroFmt = `${String(d.puntoVenta).padStart(5, '0')}-${String(d.numero).padStart(8, '0')}`;
  const tipoInfo = NOMBRE_TIPO[d.tipoComprobante] ?? { letra: 'C', nombre: 'COMPROBANTE' };

  // Datos y URL del QR.
  const datosQR: DatosQR = {
    fecha: isoFecha(d.fechaComprobante),
    cuit: Number(config.emisor.cuit),
    ptoVta: d.puntoVenta,
    tipoCmp: d.tipoComprobante,
    nroCmp: d.numero,
    importe: Number(d.importeTotal.toFixed(2)),
    moneda: d.moneda,
    ctz: d.cotizacion,
    tipoDocRec: d.receptor.docTipo,
    nroDocRec: Number(d.receptor.docNro || 0),
    codAut: Number(d.cae),
  };
  const qrUrl = construirUrlQR(datosQR, config.env);
  const qrDataUrl = await generarQRDataUrl(qrUrl);
  const qrBuffer = Buffer.from(qrDataUrl.split(',')[1] ?? '', 'base64');

  const fileName = `${config.env}_${d.tipoComprobante}_${nroFmt}.pdf`;
  const pdfPath = path.join(config.paths.comprobantesDir, fileName);

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);
    stream.on('finish', () => resolve());
    stream.on('error', reject);

    const W = doc.page.width;
    const L = 40;
    const R = W - 40;
    const midX = W / 2;

    // Aviso de homologación (marca de agua textual).
    if (config.env === 'homo') {
      doc.save();
      doc.fontSize(9).fillColor('#b00').text('COMPROBANTE EMITIDO EN HOMOLOGACIÓN (SIN VALIDEZ FISCAL)', L, 20, {
        width: R - L,
        align: 'center',
      });
      doc.restore();
    }

    // Recuadro superior con la letra en el centro.
    const topY = 40;
    doc.rect(L, topY, R - L, 90).stroke();
    doc.moveTo(midX, topY).lineTo(midX, topY + 90).stroke();

    // Letra "C" centrada arriba.
    doc.rect(midX - 22, topY - 0, 44, 34).stroke();
    doc.fontSize(28).fillColor('#000').text(tipoInfo.letra, midX - 22, topY + 4, { width: 44, align: 'center' });
    doc.fontSize(7).text(`COD. ${String(d.tipoComprobante).padStart(2, '0')}`, midX - 22, topY + 36, {
      width: 44,
      align: 'center',
    });

    // Emisor (izquierda).
    doc.fontSize(15).text(config.emisor.razonSocial, L + 10, topY + 8, { width: midX - L - 20 });
    doc.fontSize(8).fillColor('#333');
    doc.text(`CUIT: ${config.emisor.cuit}`, L + 10, topY + 34);
    if (config.emisor.domicilio) doc.text(config.emisor.domicilio, L + 10, topY + 46, { width: midX - L - 20 });
    doc.text(config.emisor.condicionIva, L + 10, topY + 58);
    if (config.emisor.ingresosBrutos) doc.text(`IIBB: ${config.emisor.ingresosBrutos}`, L + 10, topY + 70);

    // Comprobante (derecha).
    doc.fillColor('#000').fontSize(13).text(tipoInfo.nombre, midX + 10, topY + 6, { width: R - midX - 20 });
    doc.fontSize(9);
    doc.text(`Nº ${nroFmt}`, midX + 10, topY + 26);
    doc.text(`Fecha de Emisión: ${fmtFecha(d.fechaComprobante)}`, midX + 10, topY + 40);
    doc.text(`Punto de Venta: ${String(d.puntoVenta).padStart(5, '0')}`, midX + 10, topY + 54);

    let y = topY + 100;

    // Período facturado (si es servicios).
    if (d.concepto !== 1 && d.periodoDesde && d.periodoHasta) {
      doc.rect(L, y, R - L, 22).stroke();
      doc.fontSize(8).text(
        `Período Facturado Desde: ${fmtFecha(d.periodoDesde)}   Hasta: ${fmtFecha(d.periodoHasta)}   ` +
          `Vto. para el pago: ${d.vencimientoPago ? fmtFecha(d.vencimientoPago) : '-'}`,
        L + 8,
        y + 7,
      );
      y += 30;
    }

    // Datos del receptor.
    doc.rect(L, y, R - L, 56).stroke();
    doc.fontSize(9).fillColor('#000');
    doc.text(`${nombreDoc(d.receptor.docTipo)}: ${d.receptor.docNro || '-'}`, L + 8, y + 8);
    doc.text(`Razón Social: ${d.receptor.razonSocial}`, L + 8, y + 22);
    doc.text(`Condición frente al IVA: ${d.receptor.condicionIvaDesc}`, L + 8, y + 36);
    if (d.receptor.domicilio) doc.text(`Domicilio: ${d.receptor.domicilio}`, midX, y + 8, { width: R - midX - 8 });
    y += 66;

    // Encabezado de la tabla de ítems.
    const colDesc = L + 8;
    const colCant = R - 260;
    const colPrecio = R - 170;
    const colSub = R - 90;
    doc.rect(L, y, R - L, 20).fillAndStroke('#f0f0f0', '#000');
    doc.fillColor('#000').fontSize(8);
    doc.text('Descripción', colDesc, y + 6);
    doc.text('Cant.', colCant, y + 6);
    doc.text('P. Unitario', colPrecio, y + 6);
    doc.text('Subtotal', colSub, y + 6, { width: R - colSub - 8, align: 'right' });
    y += 20;

    // Filas.
    doc.fontSize(8);
    for (const it of d.items) {
      const h = 16;
      doc.text(it.descripcion, colDesc, y + 4, { width: colCant - colDesc - 4 });
      doc.text(String(it.cantidad), colCant, y + 4);
      doc.text('$ ' + money(it.precioUnitario), colPrecio, y + 4);
      doc.text('$ ' + money(it.subtotal), colSub, y + 4, { width: R - colSub - 8, align: 'right' });
      y += h;
      doc.moveTo(L, y).lineTo(R, y).strokeColor('#ddd').stroke().strokeColor('#000');
    }

    // Total.
    y += 10;
    doc.fontSize(11).text(`IMPORTE TOTAL:  $ ${money(d.importeTotal)}`, L, y, {
      width: R - L,
      align: 'right',
    });
    doc.fontSize(7).fillColor('#555').text(
      'Comprobante C: el importe no discrimina IVA (Régimen Simplificado - Monotributo).',
      L,
      y + 18,
      { width: R - L, align: 'right' },
    );

    // Pie: QR + CAE.
    const pieY = doc.page.height - 150;
    doc.image(qrBuffer, L, pieY, { width: 110, height: 110 });
    doc.fillColor('#000').fontSize(10);
    doc.text('CAE Nº:', L + 130, pieY + 20);
    doc.font('Helvetica-Bold').text(d.cae, L + 190, pieY + 20);
    doc.font('Helvetica').text('Fecha de Vto. de CAE:', L + 130, pieY + 40);
    doc.font('Helvetica-Bold').text(fmtFecha(d.caeVto), L + 270, pieY + 40);
    doc.font('Helvetica').fillColor('#555').fontSize(7).text(
      'Consultá la validez de este comprobante escaneando el QR en el sitio de ARCA.',
      L + 130,
      pieY + 70,
      { width: R - (L + 130) },
    );

    doc.end();
  });

  return { pdfPath, qrUrl };
}
