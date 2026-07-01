/**
 * config.ts
 * ---------
 * Carga y valida la configuración desde `.env`.
 *
 * Reglas de seguridad importantes:
 *  - El ambiente por defecto es HOMOLOGACIÓN.
 *  - Para usar PRODUCCIÓN hacen falta DOS cosas a la vez: ARCA_ENV=prod
 *    y ARCA_ALLOW_PROD=si. Así evitamos emitir comprobantes reales por error.
 */

import 'dotenv/config';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Carpeta raíz del proyecto (arca-facturador/), para resolver rutas relativas.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(__dirname, '..');

function resolveFromRoot(p: string): string {
  return path.isAbsolute(p) ? p : path.join(PROJECT_ROOT, p);
}

const EnvSchema = z.object({
  ARCA_ENV: z.enum(['homo', 'prod']).default('homo'),
  ARCA_ALLOW_PROD: z.string().default('no'),

  EMISOR_CUIT: z.string().regex(/^\d{11}$/, 'EMISOR_CUIT debe tener 11 dígitos'),
  EMISOR_RAZON_SOCIAL: z.string().min(1),
  EMISOR_DOMICILIO: z.string().default(''),
  EMISOR_PUNTO_VENTA: z.coerce.number().int().positive(),
  EMISOR_CONDICION_IVA: z.string().default('Responsable Monotributo'),
  EMISOR_INGRESOS_BRUTOS: z.string().optional().default(''),
  EMISOR_INICIO_ACTIVIDADES: z.string().optional().default(''),

  ARCA_CERT_PATH: z.string().default('certs/certificado.crt'),
  ARCA_KEY_PATH: z.string().default('certs/clave-privada.key'),

  PORT: z.coerce.number().int().positive().default(8787),

  REDONDEO_DEFAULT: z.enum(['peso', 'decena', 'centena', 'ninguno']).default('peso'),

  EMAIL_PROVIDER: z.enum(['log', 'graph', 'smtp']).default('log'),
  EMAIL_FROM: z.string().optional().default(''),
  GRAPH_TENANT_ID: z.string().optional().default(''),
  GRAPH_CLIENT_ID: z.string().optional().default(''),
  GRAPH_CLIENT_SECRET: z.string().optional().default(''),
  SMTP_HOST: z.string().optional().default('smtp.office365.com'),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Configuración inválida en .env:');
  for (const issue of parsed.error.issues) {
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('\nRevisá tu archivo .env (podés partir de .env.example).');
  process.exit(1);
}

const env = parsed.data;

// ¿Se puede emitir en producción? Requiere la doble confirmación.
const prodHabilitada = env.ARCA_ENV === 'prod' && env.ARCA_ALLOW_PROD.toLowerCase() === 'si';

if (env.ARCA_ENV === 'prod' && !prodHabilitada) {
  console.error(
    '❌ ARCA_ENV=prod pero falta ARCA_ALLOW_PROD=si. ' +
      'Producción está bloqueada para protegerte. Corregí el .env si realmente querés emitir REAL.',
  );
  process.exit(1);
}

export interface AppConfig {
  env: 'homo' | 'prod';
  esProduccion: boolean;
  emisor: {
    cuit: string;
    razonSocial: string;
    domicilio: string;
    puntoVenta: number;
    condicionIva: string;
    ingresosBrutos: string;
    inicioActividades: string;
  };
  certPath: string;
  keyPath: string;
  port: number;
  redondeoDefault: 'peso' | 'decena' | 'centena' | 'ninguno';
  email: {
    provider: 'log' | 'graph' | 'smtp';
    from: string;
    graph: { tenantId: string; clientId: string; clientSecret: string };
    smtp: { host: string; port: number; user: string; pass: string };
  };
  paths: {
    dataDir: string;
    dbFile: string;
    comprobantesDir: string;
    logsDir: string;
    taDir: string;
  };
}

const dataDir = path.join(PROJECT_ROOT, 'data');

export const config: AppConfig = {
  env: env.ARCA_ENV,
  esProduccion: env.ARCA_ENV === 'prod',
  emisor: {
    cuit: env.EMISOR_CUIT,
    razonSocial: env.EMISOR_RAZON_SOCIAL,
    domicilio: env.EMISOR_DOMICILIO,
    puntoVenta: env.EMISOR_PUNTO_VENTA,
    condicionIva: env.EMISOR_CONDICION_IVA,
    ingresosBrutos: env.EMISOR_INGRESOS_BRUTOS,
    inicioActividades: env.EMISOR_INICIO_ACTIVIDADES,
  },
  certPath: resolveFromRoot(env.ARCA_CERT_PATH),
  keyPath: resolveFromRoot(env.ARCA_KEY_PATH),
  port: env.PORT,
  redondeoDefault: env.REDONDEO_DEFAULT,
  email: {
    provider: env.EMAIL_PROVIDER,
    from: env.EMAIL_FROM,
    graph: {
      tenantId: env.GRAPH_TENANT_ID,
      clientId: env.GRAPH_CLIENT_ID,
      clientSecret: env.GRAPH_CLIENT_SECRET,
    },
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  },
  paths: {
    dataDir,
    dbFile: path.join(dataDir, `facturador-${env.ARCA_ENV}.db`),
    comprobantesDir: path.join(dataDir, 'comprobantes'),
    logsDir: path.join(dataDir, 'logs'),
    taDir: dataDir,
  },
};
