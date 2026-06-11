// Cálculo puro de una importación (sin dependencias del navegador ni de Supabase).
// Lo usan tanto el frontend (importsStore) como el robot de sincronización (agent/).

import {
  parseBalanceGeneral,
  parseBalanceParcial,
  parseComposicionSaldos,
  parseMayor,
  type BalanceGeneral,
  type BalanceParcial,
  type Composicion,
  type Mayor,
} from "./oliauto";

export type TipoImportacion = "balance_parcial" | "composicion" | "balance_general" | "mayor";

export type PayloadImportacion = BalanceParcial | Composicion | BalanceGeneral | Mayor;

export interface ImportacionCalculada {
  periodo: string | null;
  corte: string | null;
  payload: PayloadImportacion;
  resumen: Record<string, number | string | null>;
}

/** Calcula el payload + resumen de un balance parcial (rentabilidad por depto). */
function desdeBalance(aoa: unknown[][], headerRow: number): ImportacionCalculada {
  const payload = parseBalanceParcial(aoa, headerRow);
  const ultimo = payload.periodos[payload.periodos.length - 1] ?? null;
  const tot = ultimo ? payload.totales[ultimo] : undefined;
  return {
    periodo: ultimo,
    corte: null,
    payload,
    resumen: {
      periodo: ultimo,
      ingresos: tot?.ingresos ?? 0,
      resultado: tot?.resultado ?? 0,
      cuentas: payload.cuentasProcesadas,
      departamentos: Object.keys(payload.porDepto).length,
    },
  };
}

/** Calcula el payload + resumen de una composición de saldos (cuentas corrientes). */
function desdeComposicion(aoa: unknown[][], headerRow: number): ImportacionCalculada {
  const payload = parseComposicionSaldos(aoa, headerRow);
  return {
    periodo: payload.corte?.slice(0, 7) ?? null,
    corte: payload.corte ?? null,
    payload,
    resumen: {
      corte: payload.corte,
      totalDeudor: payload.totalDeudor,
      mas90: payload.buckets.mas90,
      clientesDeudores: payload.clientesDeudores,
    },
  };
}

/** Calcula el payload + resumen de un balance general (situación patrimonial). */
function desdeBalanceGeneral(aoa: unknown[][], headerRow: number): ImportacionCalculada {
  const payload = parseBalanceGeneral(aoa, headerRow);
  return {
    periodo: null,
    corte: null,
    payload,
    resumen: {
      activo: payload.activo,
      pasivo: payload.pasivo,
      patrimonioNeto: payload.patrimonioNeto,
      resultado: payload.resultadoEjercicio,
      liquidez: payload.liquidezCorriente,
    },
  };
}

/** Calcula el payload + resumen de un libro mayor. */
function desdeMayor(aoa: unknown[][], headerRow: number): ImportacionCalculada {
  const payload = parseMayor(aoa, headerRow);
  return {
    periodo: payload.fechaMax?.slice(0, 7) ?? null,
    corte: payload.fechaMax || null,
    payload,
    resumen: {
      movimientos: payload.movimientos,
      cuentas: payload.cuentas,
      totalDebe: payload.totalDebe,
      totalHaber: payload.totalHaber,
      sinComprobante: payload.sinComprobante,
    },
  };
}

/** Despacha el cálculo según el tipo de reporte. */
export function computarImportacion(
  tipo: TipoImportacion,
  aoa: unknown[][],
  headerRow: number,
): ImportacionCalculada {
  switch (tipo) {
    case "balance_parcial":
      return desdeBalance(aoa, headerRow);
    case "composicion":
      return desdeComposicion(aoa, headerRow);
    case "balance_general":
      return desdeBalanceGeneral(aoa, headerRow);
    case "mayor":
      return desdeMayor(aoa, headerRow);
  }
}
