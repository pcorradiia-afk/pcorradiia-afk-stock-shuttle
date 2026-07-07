/**
 * mailer.ts
 * ---------
 * Envío de email con interfaz ABSTRACTA para desacoplar el proveedor.
 *
 * Estado (Fase 5 pendiente de definir proveedor):
 *   - 'log'   → NO envía nada real; registra el "envío" (útil para dry-run/pruebas).
 *   - 'graph' → Microsoft Graph API (stub con guía; se completa al elegirlo).
 *   - 'smtp'  → Office 365 SMTP (stub con guía; se completa al elegirlo).
 *
 * Todos los envíos (reales o simulados) quedan registrados en la tabla
 * envios_email, con estado y reintentos.
 */

import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { logger } from '../logger.js';

export interface EmailAdjunto {
  filename: string;
  path: string;
  contentType?: string;
}

export interface EmailMensaje {
  para: string;
  asunto: string;
  cuerpoHtml: string;
  cuerpoTexto?: string;
  adjuntos?: EmailAdjunto[];
}

export interface EmailProvider {
  readonly nombre: string;
  enviar(msg: EmailMensaje): Promise<void>;
}

/** Proveedor "log": no envía, deja constancia en disco. Ideal para dry-run. */
class LogEmailProvider implements EmailProvider {
  readonly nombre = 'log';
  async enviar(msg: EmailMensaje): Promise<void> {
    const dir = path.join(config.paths.logsDir, 'emails');
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(dir, `${stamp}_${sanit(msg.para)}.txt`);
    const contenido =
      `DE: ${config.email.from || '(EMAIL_FROM no configurado)'}\n` +
      `PARA: ${msg.para}\nASUNTO: ${msg.asunto}\n` +
      `ADJUNTOS: ${(msg.adjuntos ?? []).map((a) => a.filename).join(', ') || '(ninguno)'}\n\n` +
      `${msg.cuerpoTexto ?? stripHtml(msg.cuerpoHtml)}\n`;
    fs.writeFileSync(file, contenido, 'utf8');
    logger.info(`📧 [log] Email simulado a ${msg.para} — registrado en ${file}`);
  }
}

/**
 * Stub de Microsoft Graph. Se implementa cuando confirmes el proveedor.
 * Flujo previsto: client credentials (tenant/client/secret) → token →
 * POST /users/{EMAIL_FROM}/sendMail con el adjunto en base64.
 */
class GraphEmailProvider implements EmailProvider {
  readonly nombre = 'graph';
  async enviar(_msg: EmailMensaje): Promise<void> {
    throw new Error(
      'EMAIL_PROVIDER=graph todavía no está implementado. ' +
        'Al confirmarlo se completa con Microsoft Graph (registro de app en Azure/Entra, permiso Mail.Send). ' +
        'Mientras tanto usá EMAIL_PROVIDER=log.',
    );
  }
}

/** Stub de SMTP Office 365 (requiere OAuth2 moderno; auth básica está deshabilitada). */
class SmtpEmailProvider implements EmailProvider {
  readonly nombre = 'smtp';
  async enviar(_msg: EmailMensaje): Promise<void> {
    throw new Error(
      'EMAIL_PROVIDER=smtp todavía no está implementado. ' +
        'Al confirmarlo se completa con smtp.office365.com:587 (STARTTLS) y OAuth2. ' +
        'Mientras tanto usá EMAIL_PROVIDER=log.',
    );
  }
}

export function crearEmailProvider(): EmailProvider {
  switch (config.email.provider) {
    case 'graph':
      return new GraphEmailProvider();
    case 'smtp':
      return new SmtpEmailProvider();
    case 'log':
    default:
      return new LogEmailProvider();
  }
}

function sanit(s: string): string {
  return s.replace(/[^a-z0-9@._-]/gi, '_');
}
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim();
}
