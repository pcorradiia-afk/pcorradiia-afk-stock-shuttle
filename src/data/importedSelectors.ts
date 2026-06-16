import type { Importacion } from "./importsStore";
import { clasificarGasto } from "./clasificacionGastos";
import { DEPTOS_OLIAUTO } from "@/lib/oliauto";
import type { BalanceParcial, BalanceGeneral, Composicion, CeldaPL, ComunRubro, CuentaBP, LineaCuenta, Mayor, Ventas0km } from "@/lib/oliauto";

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
  /** Detalle por cuenta contable (todas las empresas visibles), para drill-down. */
  cuentas: CuentaBP[];
}

/**
 * Consolida los balances parciales importados (último por empresa) en una
 * matriz depto × período, base del cuadro de situación económica.
 */
/** Reparto de una cuenta entre varios deptos (por % de ventas o % fijo). */
export interface RepartoCuenta {
  modo: "ventas" | "fijo";
  deptos: string[];
  pct?: Record<string, number>;
}
/** Reasignación manual de una cuenta: depto, línea y/o reparto entre deptos. */
export type OverrideCuenta = { depto?: string; linea?: LineaCuenta; reparto?: RepartoCuenta };
export type OverridesCuentas = Record<string, OverrideCuenta>;

export function gestionImportada(
  importaciones: Importacion[],
  empresaIds: string[],
  overrides: OverridesCuentas = {},
): GestionImportada {
  const fuentes = ultimaPorEmpresa(importaciones, "balance_parcial", empresaIds);
  const porDepto: Record<string, Record<string, CeldaPL>> = {};
  const comunes: Record<string, Record<string, ComunRubro>> = {};
  const cuentas: CuentaBP[] = [];
  const periodos = new Set<string>();

  const celdaDe = (depto: string, per: string) => (((porDepto[depto] ??= {})[per] ??= vacia()));

  // Aplica el aporte (r = contribución al resultado, acreedor positivo) de una
  // cuenta a un depto/línea, y alimenta el desglose de comunes de Unidades.
  const aplicar = (depto: string, linea: LineaCuenta, per: string, r: number, codigo: string, nombre: string) => {
    const cd = celdaDe(depto, per);
    cd.resultado += r;
    if (linea === "venta") cd.ingresos += r;
    else if (linea === "costo") cd.costos += -r;
    else if (linea === "otros") cd.otrosIng = (cd.otrosIng ?? 0) + r;
    else {
      cd.gastos += -r;
      if (linea === "gvar") cd.gastosVar = (cd.gastosVar ?? 0) + -r;
      if (depto === "unidades") {
        const rub = codigo.slice(0, 6);
        const dst = (comunes[per] ??= {});
        const a = (dst[rub] ??= { gastos: 0, gastosVar: 0, nombre });
        a.gastos += -r;
        if (linea === "gvar") a.gastosVar += -r;
      }
    }
  };

  // Cuentas con reparto por % de ventas: se resuelven en una 2.ª pasada, cuando
  // ya están calculadas las ventas por departamento.
  const repartoVentas: { codigo: string; nombre: string; linea: LineaCuenta; per: string; r: number; deptos: string[] }[] = [];

  for (const imp of fuentes) {
    const p = imp.payload as BalanceParcial;
    for (const per of p.periodos ?? []) periodos.add(per);

    if (p.cuentas && p.cuentas.length > 0) {
      // Reconstruye el cuadro desde cada cuenta, aplicando la parametrización.
      for (const c of p.cuentas) {
        // Default de grupo: las cuentas marcadas "costo directo" (hoja CTO. SER.
        // del EEFF) van a Costos, aunque por su código caerían en gastos. El
        // ajuste manual en Plan de cuentas tiene prioridad sobre este default.
        const ov =
          overrides[c.codigo] ??
          (clasificarGasto(c.codigo) === "costo_directo" ? { linea: "costo" as LineaCuenta } : {});
        const linea = ov.linea ?? c.linea;
        const rep = ov.reparto && ov.reparto.deptos.length > 0 ? ov.reparto : null;
        const deptoVista = rep ? rep.deptos[0] : ov.depto ?? c.depto;
        cuentas.push({ ...c, depto: deptoVista, linea });
        for (const [per, r] of Object.entries(c.valores)) {
          if (!rep) {
            aplicar(ov.depto ?? c.depto, linea, per, r, c.codigo, c.nombre);
          } else if (rep.modo === "fijo") {
            const tot = rep.deptos.reduce((a, d) => a + (rep.pct?.[d] ?? 0), 0) || 1;
            for (const d of rep.deptos) aplicar(d, linea, per, (r * (rep.pct?.[d] ?? 0)) / tot, c.codigo, c.nombre);
          } else {
            repartoVentas.push({ codigo: c.codigo, nombre: c.nombre, linea, per, r, deptos: rep.deptos });
          }
        }
      }
    } else {
      // Importación vieja sin detalle por cuenta: usar el agregado del parser.
      for (const [per, rubros] of Object.entries(p.comunesUnidades ?? {})) {
        const dst = (comunes[per] ??= {});
        for (const [rub, c] of Object.entries(rubros)) {
          const a = (dst[rub] ??= { gastos: 0, gastosVar: 0, nombre: c.nombre });
          a.gastos += c.gastos;
          a.gastosVar += c.gastosVar;
        }
      }
      for (const { key } of DEPTOS_OLIAUTO) {
        const porPer = p.porDepto?.[key];
        if (!porPer) continue;
        for (const [per, celda] of Object.entries(porPer)) {
          const a = celdaDe(key, per);
          a.ingresos += celda.ingresos;
          a.costos += celda.costos;
          a.gastos += celda.gastos;
          a.resultado += celda.resultado;
          if (celda.gastosVar !== undefined) a.gastosVar = (a.gastosVar ?? 0) + celda.gastosVar;
          if (celda.otrosIng !== undefined) a.otrosIng = (a.otrosIng ?? 0) + celda.otrosIng;
        }
      }
    }
  }

  // 2.ª pasada: reparto por % de ventas (usa las ventas por depto ya calculadas).
  for (const item of repartoVentas) {
    const vs = item.deptos.map((d) => Math.max(0, porDepto[d]?.[item.per]?.ingresos ?? 0));
    const tot = vs.reduce((a, b) => a + b, 0);
    item.deptos.forEach((d, i) => {
      const w = tot ? vs[i] / tot : 1 / item.deptos.length;
      aplicar(d, item.linea, item.per, item.r * w, item.codigo, item.nombre);
    });
  }

  return {
    hayDatos: fuentes.length > 0,
    periodos: [...periodos].sort(),
    porDepto,
    comunes,
    cuentas,
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
