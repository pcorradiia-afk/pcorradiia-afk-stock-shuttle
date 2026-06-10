import type { DepartamentoTipo, Periodo, ResultadoDepto } from "@/types";
import { CUENTAS_CORRIENTES, PERIODOS, RESULTADOS, VENTAS } from "./demo";

/** Período más reciente disponible. */
export const ultimoPeriodo: Periodo = PERIODOS[PERIODOS.length - 1];
export const periodoAnterior: Periodo = PERIODOS[PERIODOS.length - 2];

export function resultadoNeto(r: ResultadoDepto): number {
  return r.ingresos - r.costos - r.gastos;
}

export function margenBruto(r: ResultadoDepto): number {
  return r.ingresos - r.costos;
}

/** Filtra resultados por empresas visibles y (opcional) período. */
export function resultados(empresaIds: string[], periodo?: Periodo): ResultadoDepto[] {
  return RESULTADOS.filter(
    (r) => empresaIds.includes(r.empresaId) && (!periodo || r.periodo === periodo),
  );
}

export interface ResumenDepto {
  depto: DepartamentoTipo;
  ingresos: number;
  costos: number;
  gastos: number;
  margenBruto: number;
  resultado: number;
}

/** Agrega resultado por departamento para las empresas/período dados. */
export function resumenPorDepto(empresaIds: string[], periodo: Periodo): ResumenDepto[] {
  const map = new Map<DepartamentoTipo, ResumenDepto>();
  for (const r of resultados(empresaIds, periodo)) {
    const cur = map.get(r.depto) ?? {
      depto: r.depto, ingresos: 0, costos: 0, gastos: 0, margenBruto: 0, resultado: 0,
    };
    cur.ingresos += r.ingresos;
    cur.costos += r.costos;
    cur.gastos += r.gastos;
    cur.margenBruto += margenBruto(r);
    cur.resultado += resultadoNeto(r);
    map.set(r.depto, cur);
  }
  const orden: DepartamentoTipo[] = ["0km", "usados", "posventa", "repuestos", "admin"];
  return orden.filter((d) => map.has(d)).map((d) => map.get(d)!);
}

export interface Totales {
  ingresos: number;
  resultado: number;
  margenBruto: number;
}

export function totales(empresaIds: string[], periodo: Periodo): Totales {
  return resultados(empresaIds, periodo).reduce<Totales>(
    (acc, r) => ({
      ingresos: acc.ingresos + r.ingresos,
      resultado: acc.resultado + resultadoNeto(r),
      margenBruto: acc.margenBruto + margenBruto(r),
    }),
    { ingresos: 0, resultado: 0, margenBruto: 0 },
  );
}

/** Serie temporal de resultado neto e ingresos por período. */
export function serieMensual(empresaIds: string[]): { periodo: Periodo; ingresos: number; resultado: number }[] {
  return PERIODOS.map((periodo) => {
    const t = totales(empresaIds, periodo);
    return { periodo, ingresos: t.ingresos, resultado: t.resultado };
  });
}

// ---- Comercial ----

export function ventasResumen(empresaIds: string[], periodo: Periodo) {
  const v = VENTAS.filter((x) => empresaIds.includes(x.empresaId) && x.periodo === periodo);
  const unidades = v.reduce((a, x) => a + x.unidades, 0);
  const facturacion = v.reduce((a, x) => a + x.facturacion, 0);
  const margen = v.reduce((a, x) => a + x.margen, 0);
  const u0km = v.filter((x) => x.depto === "0km").reduce((a, x) => a + x.unidades, 0);
  const uUsados = v.filter((x) => x.depto === "usados").reduce((a, x) => a + x.unidades, 0);
  return { unidades, facturacion, margen, u0km, uUsados };
}

export function ventasSerie(empresaIds: string[]) {
  return PERIODOS.map((periodo) => {
    const v = VENTAS.filter((x) => empresaIds.includes(x.empresaId) && x.periodo === periodo);
    return {
      periodo,
      "0km": v.filter((x) => x.depto === "0km").reduce((a, x) => a + x.unidades, 0),
      usados: v.filter((x) => x.depto === "usados").reduce((a, x) => a + x.unidades, 0),
    };
  });
}

// ---- Cuentas corrientes / mora ----

export function moraResumen(empresaIds: string[], periodo: Periodo) {
  const cc = CUENTAS_CORRIENTES.filter((x) => empresaIds.includes(x.empresaId) && x.periodo === periodo);
  const alDia = cc.reduce((a, x) => a + x.alDia, 0);
  const d30 = cc.reduce((a, x) => a + x.d30, 0);
  const d60 = cc.reduce((a, x) => a + x.d60, 0);
  const d90 = cc.reduce((a, x) => a + x.d90, 0);
  const mas90 = cc.reduce((a, x) => a + x.mas90, 0);
  const total = alDia + d30 + d60 + d90 + mas90;
  const vencido = d30 + d60 + d90 + mas90;
  return { alDia, d30, d60, d90, mas90, total, vencido, pctMora: total ? (vencido / total) * 100 : 0 };
}
