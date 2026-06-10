// Motor de análisis para reportes de Oliauto.
// Clasifica las cuentas de resultado (clase 5) por departamento usando el código,
// que en el plan de cuentas de Oliauto ya codifica el departamento:
//   51 Unidades (511/513 = 0km · 512/514 = usados · 515+ = gastos comunes)
//   52 Repuestos · 53 Servicios/Posventa · 55 Administración (gastos indirectos)
//   56 Financieros · 57/58 Varios

export interface DeptoDef {
  key: string;
  label: string;
}

export const DEPTOS_OLIAUTO: DeptoDef[] = [
  { key: "0km", label: "Unidades 0km" },
  { key: "usados", label: "Unidades usados" },
  { key: "unidades", label: "Unidades (gastos comunes)" },
  { key: "repuestos", label: "Repuestos" },
  { key: "posventa", label: "Servicios / Posventa" },
  { key: "admin", label: "Administración (indirectos)" },
  { key: "financiero", label: "Resultados financieros" },
  { key: "varios", label: "Resultados varios" },
];

export function deptoDeCuenta(codigo: string): string | null {
  const c = codigo.trim();
  if (!c.startsWith("5")) return null; // solo cuentas de resultado
  if (c.startsWith("511") || c.startsWith("513")) return "0km";
  if (c.startsWith("512") || c.startsWith("514")) return "usados";
  if (c.startsWith("51")) return "unidades";
  if (c.startsWith("52")) return "repuestos";
  if (c.startsWith("53")) return "posventa";
  if (c.startsWith("55")) return "admin";
  if (c.startsWith("56")) return "financiero";
  if (c.startsWith("57") || c.startsWith("58")) return "varios";
  return null;
}

function num(v: unknown): number {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}

export type Naturaleza = "venta" | "costo" | "gasto" | "mixto";

/**
 * Naturaleza de la cuenta según el código de Oliauto. Las cuentas operativas
 * (ventas/costos/gastos) quedan fijas; las de "otros ingresos y egresos",
 * financieras y varias se marcan "mixto" y se resuelven por el signo del saldo.
 */
export function naturalezaDeCuenta(codigo: string): Naturaleza {
  const c = codigo.trim();
  // Ventas: 0km/usados/corporativas, repuestos, servicios (incl. Esquel 5351)
  if (/^51[128]/.test(c) || /^521/.test(c) || /^531/.test(c) || /^5351/.test(c)) return "venta";
  // Costos
  if (/^51[34]/.test(c) || /^522/.test(c) || /^532/.test(c) || /^5352/.test(c)) return "costo";
  // Gastos operativos puros (gastos de depto + indirectos)
  if (/^515/.test(c) || /^523/.test(c) || /^533/.test(c) || /^535/.test(c) || /^55/.test(c)) return "gasto";
  // 516/517/524/534/56/57/58: otros ing/egr, financieros y varios → por signo
  return "mixto";
}

/** 'm/aaaa' o 'm/a.aaa' -> 'YYYY-MM'. Devuelve null si no es un período. */
function parsePeriodo(label: string): string | null {
  const m = String(label).match(/^(\d{1,2})\/(\d[\d.]*)$/);
  if (!m) return null;
  const mes = Number(m[1]);
  const anio = Number(m[2].replace(/\./g, ""));
  if (!mes || mes > 12 || anio < 1900) return null;
  return `${anio}-${String(mes).padStart(2, "0")}`;
}

export interface CeldaPL {
  ingresos: number;
  costos: number;
  gastos: number;
  resultado: number;
}

export interface BalanceParcial {
  periodos: string[];
  /** resultado[deptoKey][periodo] */
  porDepto: Record<string, Record<string, CeldaPL>>;
  /** total[periodo] */
  totales: Record<string, CeldaPL>;
  cuentasProcesadas: number;
}

function celdaVacia(): CeldaPL {
  return { ingresos: 0, costos: 0, gastos: 0, resultado: 0 };
}

/**
 * Procesa un "balance parcial" de Oliauto (código + descripción + columnas mensuales).
 * Las ventas figuran con saldo acreedor (negativo), por eso el resultado se invierte.
 */
export function parseBalanceParcial(aoa: unknown[][], headerRow: number): BalanceParcial {
  const header = (aoa[headerRow - 1] ?? []) as unknown[];

  // Detectar columnas mensuales y la de código/descripción.
  const colPeriodo: { idx: number; periodo: string }[] = [];
  header.forEach((h, i) => {
    const p = parsePeriodo(String(h));
    if (p) colPeriodo.push({ idx: i, periodo: p });
  });
  const colCodigo = header.findIndex((h) => /cod/i.test(String(h)));
  const iCod = colCodigo >= 0 ? colCodigo : 0;

  const periodos = colPeriodo.map((c) => c.periodo);
  const porDepto: Record<string, Record<string, CeldaPL>> = {};
  const totales: Record<string, CeldaPL> = {};
  for (const p of periodos) totales[p] = celdaVacia();

  let cuentasProcesadas = 0;
  for (let r = headerRow; r < aoa.length; r++) {
    const row = aoa[r] as unknown[];
    const codigo = String(row?.[iCod] ?? "").trim();
    const depto = deptoDeCuenta(codigo);
    if (!depto) continue;
    const nat = naturalezaDeCuenta(codigo);
    cuentasProcesadas++;

    if (!porDepto[depto]) {
      porDepto[depto] = {};
      for (const p of periodos) porDepto[depto][p] = celdaVacia();
    }
    for (const { idx, periodo } of colPeriodo) {
      const val = num(row?.[idx]);
      if (val === 0) continue;
      const cd = porDepto[depto][periodo];
      const tot = totales[periodo];
      // En "mixto", un saldo acreedor (negativo) es ingreso; deudor (positivo) es gasto.
      const efectiva = nat === "mixto" ? (val < 0 ? "venta" : "gasto") : nat;
      if (efectiva === "venta") { cd.ingresos += -val; tot.ingresos += -val; }
      else if (efectiva === "costo") { cd.costos += val; tot.costos += val; }
      else { cd.gastos += val; tot.gastos += val; }
      cd.resultado += -val;
      tot.resultado += -val;
    }
  }

  return { periodos, porDepto, totales, cuentasProcesadas };
}

/** ¿El archivo parece un balance parcial de Oliauto (tiene columnas mensuales)? */
export function pareceBalanceParcial(header: unknown[]): boolean {
  return header.filter((h) => parsePeriodo(String(h))).length >= 2;
}

// ============ Composición de saldos / Cuentas corrientes (antigüedad) ============

export interface AgingBuckets {
  alDia: number;
  d30: number;
  d60: number;
  d90: number;
  mas90: number;
}

export interface DeudorTop {
  codigo: string;
  nombre: string;
  saldo: number;
}

export interface Composicion {
  corte: string; // ISO 'YYYY-MM-DD'
  buckets: AgingBuckets;
  totalDeudor: number;
  totalAcreedor: number;
  clientesDeudores: number;
  topDeudores: DeudorTop[];
}

function serialAISO(serial: number): string {
  return new Date(Date.UTC(1899, 11, 30 + Math.round(serial))).toISOString().slice(0, 10);
}

function findCol(header: unknown[], ...nombres: string[]): number {
  return header.findIndex((h) => nombres.some((n) => String(h).trim().toLowerCase() === n.toLowerCase()));
}

export function pareceComposicion(header: unknown[]): boolean {
  return findCol(header, "CodigoFicha") >= 0 && findCol(header, "FechaCont") >= 0 && findCol(header, "Debe") >= 0;
}

interface Mov { f: number; debe: number; haber: number }

/**
 * Procesa la composición de saldos de cuentas corrientes (historial de movimientos).
 * Imputa los pagos (Haber) contra las facturas (Debe) más antiguas (FIFO) por cliente,
 * y clasifica el saldo deudor pendiente por antigüedad del comprobante.
 */
export function parseComposicionSaldos(aoa: unknown[][], headerRow: number): Composicion {
  const header = (aoa[headerRow - 1] ?? []) as unknown[];
  const cF = findCol(header, "FechaCont");
  const cD = findCol(header, "Debe");
  const cH = findCol(header, "Haber");
  const cFicha = findCol(header, "CodigoFicha");
  const cNom = findCol(header, "DescripFicha", "RazonSocial");

  let ref = 0;
  const cli = new Map<string, { nombre: string; mov: Mov[] }>();
  for (let r = headerRow; r < aoa.length; r++) {
    const row = aoa[r] as unknown[];
    const f = num(row?.[cF]);
    if (f > ref && f < 80000) ref = f;
    const k = String(row?.[cFicha] ?? "").trim() || "(sin ficha)";
    if (!cli.has(k)) cli.set(k, { nombre: String(row?.[cNom] ?? "").trim() || k, mov: [] });
    cli.get(k)!.mov.push({ f, debe: num(row?.[cD]), haber: num(row?.[cH]) });
  }

  const buckets: AgingBuckets = { alDia: 0, d30: 0, d60: 0, d90: 0, mas90: 0 };
  let totalDeudor = 0;
  let totalAcreedor = 0;
  let clientesDeudores = 0;
  const top: DeudorTop[] = [];

  for (const [codigo, c] of cli) {
    const cargos = c.mov.filter((m) => m.debe > 0).map((m) => ({ f: m.f, amt: m.debe })).sort((a, b) => a.f - b.f);
    let pagos = c.mov.reduce((a, m) => a + m.haber, 0);
    for (const cg of cargos) {
      if (pagos <= 0) break;
      const p = Math.min(pagos, cg.amt);
      cg.amt -= p;
      pagos -= p;
    }
    let saldoCli = 0;
    for (const cg of cargos) {
      if (cg.amt <= 0.005) continue;
      saldoCli += cg.amt;
      const age = ref - cg.f;
      if (age <= 0) buckets.alDia += cg.amt;
      else if (age <= 30) buckets.d30 += cg.amt;
      else if (age <= 60) buckets.d60 += cg.amt;
      else if (age <= 90) buckets.d90 += cg.amt;
      else buckets.mas90 += cg.amt;
    }
    if (pagos > 0.005) totalAcreedor += pagos;
    if (saldoCli > 0.005) {
      totalDeudor += saldoCli;
      clientesDeudores++;
      top.push({ codigo, nombre: c.nombre, saldo: saldoCli });
    }
  }

  top.sort((a, b) => b.saldo - a.saldo);
  return {
    corte: ref ? serialAISO(ref) : "",
    buckets,
    totalDeudor,
    totalAcreedor,
    clientesDeudores,
    topDeudores: top.slice(0, 10),
  };
}
