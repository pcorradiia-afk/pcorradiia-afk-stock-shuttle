/**
 * cli.ts
 * ------
 * Utilidades de línea de comandos para probar el flujo en homologación sin UI.
 *
 * Uso:
 *   npm run cli estado                 → FEDummy (estado del servicio)
 *   npm run cli ta                     → obtiene el Ticket de Acceso (WSAA)
 *   npm run cli ultimo                 → último Factura C autorizado
 *   npm run cli parametros             → tablas (condición IVA receptor, etc.)
 *   npm run cli seed                   → carga un cliente de ejemplo en la libreta
 *   npm run cli dry <clienteId>        → emisión DRY-RUN de un cliente
 *   npm run cli emitir <clienteId>     → emisión REAL (pide CAE) del cliente
 */

import { config } from './config.js';
import { logger } from './logger.js';
import './db/index.js';
import { obtenerTicketAcceso } from './arca/wsaa.js';
import { dummy, ultimoAutorizado, condicionesIvaReceptor } from './arca/wsfev1.js';
import { TIPO_COMPROBANTE, CONDICION_IVA_RECEPTOR, TIPO_DOC, CONCEPTO } from './arca/types.js';
import { crearCliente, listarClientes } from './db/clientes.js';
import { emitirComprobante } from './facturacion/emisor.js';

const [cmd, arg] = process.argv.slice(2);

async function main() {
  switch (cmd) {
    case 'estado': {
      const e = await dummy();
      console.log(`Ambiente ${config.env}:`, e);
      break;
    }
    case 'ta': {
      const ta = await obtenerTicketAcceso('wsfe');
      console.log('Token (primeros 40):', ta.token.slice(0, 40) + '...');
      console.log('Vence:', ta.expiration);
      break;
    }
    case 'ultimo': {
      const n = await ultimoAutorizado(TIPO_COMPROBANTE.FACTURA_C, config.emisor.puntoVenta);
      console.log(`Último Factura C autorizado en PV ${config.emisor.puntoVenta}: ${n}. Próximo: ${n + 1}`);
      break;
    }
    case 'parametros': {
      const cond = await condicionesIvaReceptor();
      console.log('Condiciones IVA receptor:', cond);
      break;
    }
    case 'seed': {
      if (listarClientes().length > 0) {
        console.log('La libreta ya tiene clientes; no se carga el ejemplo.');
        break;
      }
      const id = crearCliente({
        razon_social: 'Cliente de Prueba SA',
        doc_tipo: TIPO_DOC.CUIT,
        doc_nro: '30000000007',
        condicion_iva_id: CONDICION_IVA_RECEPTOR.RESPONSABLE_MONOTRIBUTO,
        email: '',
        concepto: CONCEPTO.PRODUCTOS,
        items: [
          { descripcion: 'Servicio mensual de mantenimiento', cantidad: 1, precio_unitario: 15000 },
          { descripcion: 'Hora de soporte adicional', cantidad: 2, precio_unitario: 5000 },
        ],
      });
      console.log(`Cliente de ejemplo creado con id ${id}.`);
      break;
    }
    case 'dry':
    case 'emitir': {
      const clienteId = Number(arg);
      if (!clienteId) throw new Error('Indicá el id del cliente: npm run cli dry <clienteId>');
      const cliente = listarClientes().find((c) => c.id === clienteId);
      if (!cliente) throw new Error(`Cliente ${clienteId} no encontrado (probá "npm run cli seed")`);
      const r = await emitirComprobante(
        {
          clienteId,
          items: (cliente.items ?? []).map((it) => ({
            descripcion: it.descripcion,
            cantidad: it.cantidad,
            precioUnitario: it.precio_unitario,
          })),
          periodo: new Date().toISOString().slice(0, 7),
        },
        { dryRun: cmd === 'dry' },
      );
      console.log(cmd === 'dry' ? '🧪 Resultado DRY-RUN:' : '🧾 Resultado emisión:', r);
      break;
    }
    default:
      console.log(
        'Comandos: estado | ta | ultimo | parametros | seed | dry <clienteId> | emitir <clienteId>',
      );
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
