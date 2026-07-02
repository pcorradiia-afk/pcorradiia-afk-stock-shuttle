/**
 * wsaa.ts
 * -------
 * Autenticación contra el WSAA de ARCA.
 *
 * Flujo:
 *   1. Se arma un TRA (Ticket Request Access), un XML con unicidad temporal.
 *   2. Se firma como CMS/PKCS#7 con el certificado (.crt) y la clave (.key).
 *   3. Se envía a WSAA (loginCms) y se obtiene el TA: token + sign.
 *   4. El TA se cachea en disco y se reutiliza hasta que expira (~12 hs).
 *
 * Todo el proceso criptográfico es local (node-forge): el certificado y la
 * clave NUNCA salen de tu máquina.
 */

import fs from 'node:fs';
import path from 'node:path';
import forge from 'node-forge';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { getEndpoints } from './endpoints.js';
import { soapCall, extraerFault } from './soap.js';
import { XMLParser } from 'fast-xml-parser';
import { ArcaBusinessError, type TicketAcceso } from './types.js';

const taParser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true, trimValues: true });

/** Ruta del TA cacheado para un servicio en el ambiente actual. */
function taCacheFile(service: string): string {
  return path.join(config.paths.taDir, `ta-${service}-${config.env}.xml`);
}

/**
 * Construye el XML del TRA. `generationTime` y `expirationTime` acotan la
 * validez de la solicitud (ARCA exige una ventana chica). Restamos/sumamos
 * unos minutos para tolerar desfasajes de reloj.
 */
function construirTRA(service: string): string {
  const ahora = new Date();
  const gen = new Date(ahora.getTime() - 10 * 60 * 1000); // -10 min
  const exp = new Date(ahora.getTime() + 10 * 60 * 1000); // +10 min
  // uniqueId debe ser un entero de 32 bits; usamos segundos del epoch.
  const uniqueId = Math.floor(ahora.getTime() / 1000) % 4_000_000_000;

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<loginTicketRequest version="1.0">' +
    '<header>' +
    `<uniqueId>${uniqueId}</uniqueId>` +
    `<generationTime>${gen.toISOString()}</generationTime>` +
    `<expirationTime>${exp.toISOString()}</expirationTime>` +
    '</header>' +
    `<service>${service}</service>` +
    '</loginTicketRequest>'
  );
}

/** Firma el TRA como CMS/PKCS#7 (DER, base64), como exige WSAA. */
function firmarTRA(tra: string): string {
  if (!fs.existsSync(config.certPath)) {
    throw new ArcaBusinessError(
      `No se encontró el certificado en ${config.certPath}. ` +
        'Generalo en ARCA y ajustá ARCA_CERT_PATH (ver README).',
    );
  }
  if (!fs.existsSync(config.keyPath)) {
    throw new ArcaBusinessError(
      `No se encontró la clave privada en ${config.keyPath}. ` +
        'Ajustá ARCA_KEY_PATH (ver README).',
    );
  }

  const certPem = fs.readFileSync(config.certPath, 'utf8');
  const keyPem = fs.readFileSync(config.keyPath, 'utf8');

  const certificate = forge.pki.certificateFromPem(certPem);
  const privateKey = forge.pki.privateKeyFromPem(keyPem);

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(tra, 'utf8');
  p7.addCertificate(certificate);
  p7.addSigner({
    key: privateKey,
    certificate,
    digestAlgorithm: forge.pki.oids.sha256!,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType!, value: forge.pki.oids.data! },
      { type: forge.pki.oids.messageDigest! },
      { type: forge.pki.oids.signingTime!, value: new Date().toISOString() },
    ],
  });
  // Firma "attached" (el contenido va incluido), como espera ARCA.
  p7.sign();

  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return forge.util.encode64(der);
}

/** Sobre SOAP para loginCms. */
function envelopeLoginCms(cmsBase64: string): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" ' +
    'xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">' +
    '<soapenv:Header/>' +
    '<soapenv:Body>' +
    '<wsaa:loginCms>' +
    `<wsaa:in0>${cmsBase64}</wsaa:in0>` +
    '</wsaa:loginCms>' +
    '</soapenv:Body>' +
    '</soapenv:Envelope>'
  );
}

/** Lee el TA cacheado si sigue vigente; si no, devuelve null. */
function leerTACache(service: string): TicketAcceso | null {
  const file = taCacheFile(service);
  if (!fs.existsSync(file)) return null;
  try {
    const xml = fs.readFileSync(file, 'utf8');
    const ta = parsearTA(xml, service);
    // Margen de 5 min antes del vencimiento para no usar un TA al filo.
    const vence = new Date(ta.expiration).getTime() - 5 * 60 * 1000;
    if (Date.now() < vence) return ta;
    return null;
  } catch {
    return null;
  }
}

/** Parsea el loginTicketResponse (el <loginCmsReturn> ya des-escapado). */
function parsearTA(xml: string, service: string): TicketAcceso {
  const parsed = taParser.parse(xml);
  const resp = parsed.loginTicketResponse;
  if (!resp?.credentials?.token) {
    throw new ArcaBusinessError('Respuesta de WSAA sin credenciales válidas');
  }
  return {
    token: String(resp.credentials.token),
    sign: String(resp.credentials.sign),
    expiration: String(resp.header.expirationTime),
    service,
  };
}

/**
 * Obtiene un Ticket de Acceso válido para `service` (default "wsfe"),
 * reutilizando el cache en disco si sigue vigente.
 */
export async function obtenerTicketAcceso(service = 'wsfe'): Promise<TicketAcceso> {
  const cacheado = leerTACache(service);
  if (cacheado) {
    logger.debug(`TA de "${service}" reutilizado desde cache (vence ${cacheado.expiration})`);
    return cacheado;
  }

  logger.info(`Solicitando nuevo Ticket de Acceso a WSAA para "${service}" (${config.env})...`);

  const tra = construirTRA(service);
  const cms = firmarTRA(tra);
  const endpoints = getEndpoints(config.env);

  const body = await soapCall({
    url: endpoints.wsaa,
    soapAction: '',
    envelope: envelopeLoginCms(cms),
  });

  const fault = extraerFault(body);
  if (fault) {
    // Faults típicos de WSAA son de negocio (cert vencido, servicio no
    // autorizado, TRA duplicado): NO reintentar.
    throw new ArcaBusinessError(`WSAA rechazó el login: ${fault}`);
  }

  const loginReturn = body?.loginCmsResponse?.loginCmsReturn;
  if (!loginReturn) {
    throw new ArcaBusinessError('WSAA no devolvió loginCmsReturn');
  }

  const ta = parsearTA(String(loginReturn), service);

  // Guardamos el TA (el XML devuelto) para reutilizarlo hasta que expire.
  fs.mkdirSync(config.paths.taDir, { recursive: true });
  fs.writeFileSync(taCacheFile(service), String(loginReturn), 'utf8');

  logger.info(`TA obtenido. Vence: ${ta.expiration}`);
  return ta;
}
