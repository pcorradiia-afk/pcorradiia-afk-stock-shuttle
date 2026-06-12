import type { Importacion } from "./importsStore";
import { DEPTOS_OLIAUTO } from "@/lib/oliauto";
import type { BalanceParcial, BalanceGeneral, Composicion, CeldaPL, ComunRubro, Mayor, Ventas0km } from "@/lib/oliauto";

/** Última importación de cada empresa para un tipo dado (mapa empresa→importación). */
function mapaUltima(
  importaciones: Importacion[],
  tipo: Importacion["tipo"],
  empresaIds: string[],
): Map<string, Importacion> {
  const m = new Map<string, Importacion>();
  for (const imp of importaciones) {
    if (imp.tipo !== tipo || !empresaIds.includes(imp.empresa_id)) continue;
    if (!m.has(imp.empresa_id)) m.set(imp.empresa_id, imp); // la lista viene desc
  }
  return m;
}

// ---------- Control de consistencia entre reportes ----------

export interface MesConciliacion {
  mes: string;
  mayor: number;
  parcial: number;
  diferencia: number;
  ok: boolean;
}

export interface ConciliacionEmpresa {
  empresaId: string;
  tieneMayor: boolean;
  tieneParcial: boolean;
  tieneGeneral: boolean;
  porMes: MesConciliacion[];
  totalMayor: number;
  totalParcial: number;
  difParcialMayor: number;
  resultadoGeneral: number;
  difGeneralParcial: number;
  fechaMayor: string | null;
  periodoParcial: string | null;
  /** "ok" todo cuadra · "alerta" hay diferencias · "incompleto" faltan reportes. */
  estado: "ok" | "alerta" | "incompleto";
}

const TOLERANCIA = 1; // $1 de tolerancia por redondeo

export function conciliacionPorEmpresa(
  importaciones: Importacion[],
  empresaIds: string[],
): ConciliacionEmpresa[] {
  const mayores = mapaUltima(importaciones, "mayor", empresaIds);
  const parciales = mapaUltima(importaciones, "balance_parcial", empresaIds);
  const generales = mapaUltima(importaciones, "balance_general", empresaIds);

  const conEmpresa = new Set<string>([...mayores.keys(), ...parciales.keys(), ...generales.keys()]);

  return [...conEmpresa].map((empresaId): ConciliacionEmpresa => {
    const may = mayores.get(empresaId)?.payload as Mayor | undefined;
    const bp = parciales.get(empresaId)?.payload as BalanceParcial | undefined;
    const bg = generales.get(empresaId)?.payload as BalanceGeneral | undefined;

    const resMayor = may?.resultadoPorMes ?? {};
    const resParcial: Record<string, number> = {};
    if (bp) for (const per of bp.periodos) resParcial[per] = bp.totales[per]?.resultado ?? 0;

    const meses = [...new Set([...Object.keys(resMayor), ...Object.keys(resParcial)])].sort();
    const porMes: MesConciliacion[] = meses.map((mes) => {
      const mayor = resMayor[mes] ?? 0;
      const parcial = resParcial[mes] ?? 0;
      const diferencia = mayor - parcial;
      return { mes, mayor, parcial, diferencia, ok: Math.abs(diferencia) <= TOLERANCIA };
    });

    const totalMayor = Object.values(resMayor).reduce((a, b) => a + b, 0);
    const totalParcial = Object.values(resParcial).reduce((a, b) => a + b, 0);
    const resultadoGeneral = bg?.resultadoEjercicio ?? 0;

    const tieneMayor = !!may;
    const tieneParcial = !!bp;
    const tieneGeneral = !!bg;
    const difParcialMayor = totalMayor - totalParcial;
    const difGeneralParcial = resultadoGeneral - totalParcial;

    let estado: ConciliacionEmpresa["estado"] = "ok";
    if (!tieneMayor || !tieneParcial) estado = "incompleto";
    else if (porMes.some((m) => !m.ok) || (tieneGeneral && Math.abs(difGeneralParcial) > TOLERANCIA)) {
      estado = "alerta";
    }

    return {
      empresaId,
      tieneMayor,
      tieneParcial,
      tieneGeneral,
      porMes,
      totalMayor,
      totalParcial,
      difParcialMayor,
      resultadoGeneral,
      difGeneralParcial,
      fechaMayor: may?.fechaMax ?? null,
      periodoParcial: bp ? bp.periodos[bp.periodos.length - 1] ?? null : null,
      estado,
    };
  });
}

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
    // Corriente = facturación de hasta 30 días; vencido = el resto.
    const vencido = p.buckets.d60 + p.buckets.d90 + p.buckets.mas90;
    const total = p.totalDeudor || vencido + p.buckets.alDia + p.buckets.d30;
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
  const vencido = buckets.d60 + buckets.d90 + buckets.mas90;
  porEmpresa.sort((a, b) => b.pctMora - a.pctMora);

  return {
    hayDatos: fuentes.length > 0,
    buckets,
    total,
    vencido,
    alDia: buckets.alDia + buckets.d30,
    mas90: buckets.mas90,
    pctMora: total ? (vencido / total) * 100 : 0,
    porEmpresa,
    corte,
  };
}

// ---------- Ventas 0km ----------

export interface VentasImportada {
  hayDatos: boolean;
  payload: Ventas0km | null;
  /** Conciliación contra el balance parcial (cuentas 0km), si está importado. */
  conciliacion: {
    ventasBalance: number;
    costoBalance: number;
    difVentas: number;
    difCosto: number;
  } | null;
}

export function ventasImportada(importaciones: Importacion[], empresaIds: string[]): VentasImportada {
  const fuentes = ultimaPorEmpresa(importaciones, "ventas_0km", empresaIds);
  if (fuentes.length === 0) return { hayDatos: false, payload: null, conciliacion: null };

  // Consolida (en general una sola empresa).
  const base = fuentes[0].payload as Ventas0km;
  let payload = base;
  if (fuentes.length > 1) {
    payload = fuentes.reduce<Ventas0km>((acc, f) => {
      const p = f.payload as Ventas0km;
      return {
        ...acc,
        unidades: acc.unidades + p.unidades,
        ventas: acc.ventas + p.ventas,
        costo: acc.costo + p.costo,
        resultado: acc.resultado + p.resultado,
      };
    }, { ...base, unidades: 0, ventas: 0, costo: 0, resultado: 0 });
    payload.precioProm = payload.unidades ? payload.ventas / payload.unidades : 0;
    payload.margenPct = payload.ventas ? (payload.resultado / payload.ventas) * 100 : 0;
  }

  // Conciliación: ventas (deptos 0km) y costos del balance parcial acumulado.
  const bal = ultimaPorEmpresa(importaciones, "balance_parcial", empresaIds);
  let conciliacion: VentasImportada["conciliacion"] = null;
  if (bal.length > 0) {
    let ventasBalance = 0;
    let costoBalance = 0;
    for (const imp of bal) {
      const bp = imp.payload as BalanceParcial;
      for (const per of bp.periodos ?? []) {
        const c = bp.porDepto?.["0km"]?.[per];
        if (c) {
          ventasBalance += c.ingresos;
          costoBalance += c.costos;
        }
      }
    }
    conciliacion = {
      ventasBalance,
      costoBalance,
      difVentas: payload.ventas - ventasBalance,
      difCosto: payload.costo - costoBalance,
    };
  }

  return { hayDatos: true, payload, conciliacion };
}

// ---------- Situación patrimonial (balance general) ----------

export interface PatrimonialImportada {
  hayDatos: boolean;
  activo: number;
  pasivo: number;
  pn: number;
  liquidez: number;
  solvencia: number;
  endeudamiento: number;
  /** Resultado del ejercicio (clase 5 del balance general, acumulado YTD). */
  resultadoEjercicio: number;
}

export function patrimonialImportada(importaciones: Importacion[], empresaIds: string[]): PatrimonialImportada {
  const fuentes = ultimaPorEmpresa(importaciones, "balance_general", empresaIds);
  if (fuentes.length === 0) {
    return { hayDatos: false, activo: 0, pasivo: 0, pn: 0, liquidez: 0, solvencia: 0, endeudamiento: 0, resultadoEjercicio: 0 };
  }
  let activo = 0, pasivo = 0, pn = 0, ac = 0, pc = 0, resultadoEjercicio = 0;
  for (const imp of fuentes) {
    const p = imp.payload as BalanceGeneral;
    activo += p.activo;
    pasivo += p.pasivo;
    pn += p.patrimonioNeto;
    ac += p.activoCorriente;
    pc += p.pasivoCorriente;
    resultadoEjercicio += p.resultadoEjercicio ?? 0;
  }
  return {
    hayDatos: true,
    activo,
    pasivo,
    pn,
    liquidez: pc ? ac / pc : 0,
    solvencia: pasivo ? activo / pasivo : 0,
    endeudamiento: pn ? pasivo / pn : 0,
    resultadoEjercicio,
  };
}

// ---------- Análisis de gestión (cuadro de situación económica) ----------

export interface GestionImportada {
  hayDatos: boolean;
  /** Períodos disponibles (orden cronológico). */
  periodos: string[];
  /** porDepto[deptoKey][periodo] consolidado sobre las empresas visibles. */
  porDepto: Record<string, Record<string, CeldaPL>>;
  /** Gastos comunes de Unidades por período y subrubro (consolidado), para prorrateo. */
  comunes: Record<string, Record<string, ComunRubro>>;
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
  const comunes: Record<string, Record<string, ComunRubro>> = {};
  const periodos = new Set<string>();

  for (const imp of fuentes) {
    const p = imp.payload as BalanceParcial;
    for (const per of p.periodos ?? []) periodos.add(per);
    // Consolidar el desglose de gastos comunes de Unidades por subrubro.
    for (const [per, rubros] of Object.entries(p.comunesUnidades ?? {})) {
      const dst = (comunes[per] ??= {});
      for (const [rub, c] of Object.entries(rubros)) {
        const a = (dst[rub] ??= { gastos: 0, gastosVar: 0, nombre: c.nombre });
        a.gastos += c.gastos;
        a.gastosVar += c.gastosVar;
        if (!a.nombre && c.nombre) a.nombre = c.nombre;
      }
    }
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
        // gastosVar / otrosIng solo están en importaciones nuevas.
        if (celda.gastosVar !== undefined) a.gastosVar = (a.gastosVar ?? 0) + celda.gastosVar;
        if (celda.otrosIng !== undefined) a.otrosIng = (a.otrosIng ?? 0) + celda.otrosIng;
      }
    }
  }

  return {
    hayDatos: fuentes.length > 0,
    periodos: [...periodos].sort(),
    porDepto,
    comunes,
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
