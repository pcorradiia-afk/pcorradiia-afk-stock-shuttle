/**
 * soap.ts
 * -------
 * Helper mínimo para hablar SOAP con ARCA sin depender del WSDL.
 * Construimos el sobre a mano y parseamos la respuesta con fast-xml-parser.
 *
 * Incluye reintentos con backoff exponencial SOLO ante fallas transitorias
 * (problemas de red, timeouts, HTTP 5xx). Los errores de negocio de ARCA los
 * maneja cada web service, no este módulo.
 */

import { XMLParser } from 'fast-xml-parser';
import { ArcaTransientError } from './types.js';
import { logger } from '../logger.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // Quita prefijos de namespace (soap:, ns1:, etc.) para simplificar el acceso.
  removeNSPrefix: true,
  parseTagValue: true,
  trimValues: true,
});

export interface SoapCallOptions {
  url: string;
  soapAction: string;
  /** Cuerpo XML completo del sobre SOAP. */
  envelope: string;
  /** Reintentos máximos ante fallas transitorias (default 4). */
  maxRetries?: number;
  timeoutMs?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Ejecuta una llamada SOAP con reintentos ante fallas transitorias.
 * Devuelve el objeto ya parseado (Body de la respuesta).
 */
export async function soapCall(opts: SoapCallOptions): Promise<Record<string, any>> {
  const { url, soapAction, envelope } = opts;
  const maxRetries = opts.maxRetries ?? 4;
  const timeoutMs = opts.timeoutMs ?? 30_000;

  let ultimoError: unknown;

  for (let intento = 0; intento <= maxRetries; intento++) {
    if (intento > 0) {
      const espera = 2 ** intento * 1000; // 2s, 4s, 8s, 16s...
      logger.warn(`SOAP reintento ${intento}/${maxRetries} en ${espera}ms`, { url, soapAction });
      await sleep(espera);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: soapAction,
        },
        body: envelope,
        signal: controller.signal,
      });

      const texto = await res.text();

      // 5xx = transitorio (servicio caído). 4xx suele traer un SOAP Fault de negocio.
      if (res.status >= 500) {
        ultimoError = new ArcaTransientError(`HTTP ${res.status} de ARCA`);
        continue;
      }

      const parsed = parser.parse(texto);
      const body = parsed?.Envelope?.Body ?? parsed?.Body;

      if (!body) {
        throw new ArcaTransientError('Respuesta SOAP sin Body reconocible');
      }

      // SOAP Fault (ej. TA vencido, servicio no habilitado): lo devolvemos para
      // que el caller decida; no es un fallo transitorio.
      return body;
    } catch (err) {
      // AbortError o error de red → transitorio, reintentamos.
      const esRed =
        err instanceof Error &&
        (err.name === 'AbortError' ||
          err.name === 'TypeError' ||
          err instanceof ArcaTransientError);

      if (esRed && intento < maxRetries) {
        ultimoError = err;
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  throw ultimoError instanceof Error
    ? ultimoError
    : new ArcaTransientError('Falla transitoria persistente con ARCA');
}

/** Extrae un SOAP Fault de un Body parseado, si existe. */
export function extraerFault(body: Record<string, any>): string | null {
  const fault = body?.Fault;
  if (!fault) return null;
  const reason = fault.faultstring ?? fault.Reason?.Text ?? JSON.stringify(fault);
  return typeof reason === 'string' ? reason : JSON.stringify(reason);
}
