/**
 * templates.ts
 * ------------
 * Plantilla de email configurable (asunto y cuerpo) con placeholders del
 * comprobante y el período. Podés editar los textos base acá.
 *
 * Placeholders disponibles:
 *   {{cliente}} {{periodo}} {{tipo}} {{numero}} {{fecha}} {{total}}
 *   {{cae}} {{caeVto}} {{emisor}}
 */

import { config } from '../config.js';

export interface DatosPlantilla {
  cliente: string;
  periodo: string;
  tipo: string;
  numero: string;
  fecha: string;
  total: string;
  cae: string;
  caeVto: string;
}

const ASUNTO_BASE = '{{tipo}} {{numero}} — {{emisor}} — Período {{periodo}}';

const CUERPO_BASE = `
<p>Hola {{cliente}},</p>
<p>Adjuntamos tu <strong>{{tipo}} N° {{numero}}</strong> correspondiente al período <strong>{{periodo}}</strong>.</p>
<ul>
  <li>Fecha: {{fecha}}</li>
  <li>Importe total: <strong>$ {{total}}</strong></li>
  <li>CAE: {{cae}} (vto. {{caeVto}})</li>
</ul>
<p>Ante cualquier duda, quedamos a disposición.</p>
<p>Saludos,<br/>{{emisor}}</p>
`;

function render(tpl: string, d: DatosPlantilla): string {
  const map: Record<string, string> = { ...d, emisor: config.emisor.razonSocial };
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => map[k] ?? '');
}

export function asuntoEmail(d: DatosPlantilla): string {
  return render(ASUNTO_BASE, d);
}
export function cuerpoEmail(d: DatosPlantilla): string {
  return render(CUERPO_BASE, d);
}
