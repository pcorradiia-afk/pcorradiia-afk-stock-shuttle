import type { Importacion } from "./importsStore";
import { DEPTOS_OLIAUTO } from "@/lib/oliauto";
import type { BalanceParcial, Composicion, CeldaPL } from "@/lib/oliauto";

// Deriva, desde las importaciones guardadas, las cifras que muestran los
// tableros. Toma la importación más reciente por empresa y tipo (la lista ya
// viene ordenada por fecha desc), y consolida sobre las empresas visibles.

/** Última importación de un tipo por empresa, entre las empresas dadas. */
function ultimaPorEmpresa(
  importaciones: Importacion[],
  tipo: Importacion["tipo"],
  empresaIds: string[],
): Importacion[] {
  const vistos = new Set<string>();
  const out: Importacion[] = [];
  for (const imp of importaciones) {
    if (imp.tipo !== tipo) continue;
    if (!empresaIds.includes(imp.empresa_id)) continue;
    if (vistos.has(imp.empresa_id)) continue;
    vistos.add(imp.empresa_id);
    out.push(imp);
  }
  return out;
}

// ---------- Cuentas corrientes / mora ----------

export interface MoraEmpresa {
  empresaId: string;
  total: number;
  vencido: number;
  mas90: number;
  pctMora: number;
}

export interface MoraImportada {
  hayDatos: boolean;
  buckets: { alDia: number; d30: number; d60: number; d90: number; mas90: number };
  total: number;
  vencido: number;
  alDia: number;
  mas90: number;
  pctMora: number;
  porEmpresa: MoraEmpresa[];
  corte: string | null;
}

export function moraImportada(importaciones: Importacion[], empresaIds: string[]): MoraImportada {
  const fuentes = ultimaPorEmpresa(importaciones, "composicion", empresaIds);
  const buckets = { alDia: 0, d30: 0, d60: 0, d90: 0, mas90: 0 };
  const porEmpresa: MoraEmpresa[] = [];
  let corte: string | null = null;

  for (const imp of fuentes) {
    const p = imp.payload as Composicion;
    if (!p?.buckets) continue;
    buckets.alDia += p.buckets.alDia;
    buckets.d30 += p.buckets.d30;
    buckets.d60 += p.buckets.d60;
    buckets.d90 += p.buckets.d90;
    buckets.mas90 += p.buckets.mas90;
    const vencido = p.buckets.d30 + p.buckets.d60 + p.buckets.d90 + p.buckets.mas90;
    const total = p.totalDeudor || vencido + p.buckets.alDia;
    porEmpresa.push({
      empresaId: imp.empresa_id,
      total,
      vencido,
      mas90: p.buckets.mas90,
      pctMora: total ? (vencido / total) * 100 : 0,
    });
    if (imp.corte && (!corte || imp.corte > corte)) corte = imp.corte;
  }

  const total = buckets.alDia + buckets.d30 + buckets.d60 + buckets.d90 + buckets.mas90;
  const vencido = buckets.d30 + buckets.d60 + buckets.d90 + buckets.mas90;
  porEmpresa.sort((a, b) => b.pctMora - a.pctMora);

  return {
    hayDatos: fuentes.length > 0,
    buckets,
    total,
    vencido,
    alDia: buckets.alDia,
    mas90: buckets.mas90,
    pctMora: total ? (vencido / total) * 100 : 0,
    porEmpresa,
    corte,
  };
}

// ---------- Análisis de gestión (cuadro de situación económica) ----------

export interface GestionImportada {
  hayDatos: boolean;
  /** Períodos disponibles (orden cronológico). */
  periodos: string[];
  /** porDepto[deptoKey][periodo] consolidado sobre las empresas visibles. */
  porDepto: Record<string, Record<string, CeldaPL>>;
}

/**
 * Consolida los balances parciales importados (último por empresa) en una
 * matriz depto × período, base del cuadro de situación económica.
 */
export function gestionImportada(
  importaciones: Importacion[],
  empresaIds: string[],
): GestionImportada {
  const fuentes = ultimaPorEmpresa(importaciones, "balance_parcial", empresaIds);
  const porDepto: Record<string, Record<string, CeldaPL>> = {};
  const periodos = new Set<string>();

  for (const imp of fuentes) {
    const p = imp.payload as BalanceParcial;
    for (const per of p.periodos ?? []) periodos.add(per);
    for (const { key } of DEPTOS_OLIAUTO) {
      const porPer = p.porDepto?.[key];
      if (!porPer) continue;
      const destino = (porDepto[key] ??= {});
      for (const [per, celda] of Object.entries(porPer)) {
        const a = (destino[per] ??= vacia());
        a.ingresos += celda.ingresos;
        a.costos += celda.costos;
        a.gastos += celda.gastos;
        a.resultado += celda.resultado;
      }
    }
  }

  return {
    hayDatos: fuentes.length > 0,
    periodos: [...periodos].sort(),
    porDepto,
  };
}

// ---------- Rentabilidad por departamento ----------

export interface FilaDepto {
  key: string;
  label: string;
  ingresos: number;
  costos: number;
  gastos: number;
  margenBruto: number;
  resultado: number;
}

export interface RentabilidadImportada {
  hayDatos: boolean;
  filas: FilaDepto[];
  total: { ingresos: number; costos: number; gastos: number; margenBruto: number; resultado: number };
  periodo: string | null;
}

const vacia = (): CeldaPL => ({ ingresos: 0, costos: 0, gastos: 0, resultado: 0 });

export function rentabilidadImportada(
  importaciones: Importacion[],
  empresaIds: string[],
): RentabilidadImportada {
  const fuentes = ultimaPorEmpresa(importaciones, "balance_parcial", empresaIds);
  const acum: Record<string, CeldaPL> = {};
  let periodo: string | null = null;

  for (const imp of fuentes) {
    const p = imp.payload as BalanceParcial;
    const per = p.periodos?.[p.periodos.length - 1];
    if (!per) continue;
    if (!periodo || per > periodo) periodo = per;
    for (const { key } of DEPTOS_OLIAUTO) {
      const celda = p.porDepto?.[key]?.[per];
      if (!celda) continue;
      const a = (acum[key] ??= vacia());
      a.ingresos += celda.ingresos;
      a.costos += celda.costos;
      a.gastos += celda.gastos;
      a.resultado += celda.resultado;
    }
  }

  const filas: FilaDepto[] = DEPTOS_OLIAUTO.filter((d) => acum[d.key]).map((d) => {
    const c = acum[d.key];
    return {
      key: d.key,
      label: d.label,
      ingresos: c.ingresos,
      costos: c.costos,
      gastos: c.gastos,
      margenBruto: c.ingresos - c.costos,
      resultado: c.resultado,
    };
  });

  const total = filas.reduce(
    (t, f) => ({
      ingresos: t.ingresos + f.ingresos,
      costos: t.costos + f.costos,
      gastos: t.gastos + f.gastos,
      margenBruto: t.margenBruto + f.margenBruto,
      resultado: t.resultado + f.resultado,
    }),
    { ingresos: 0, costos: 0, gastos: 0, margenBruto: 0, resultado: 0 },
  );

  return { hayDatos: fuentes.length > 0, filas, total, periodo };
}
