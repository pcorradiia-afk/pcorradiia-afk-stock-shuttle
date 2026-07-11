import { clasificarGasto } from "@/data/clasificacionGastos";

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
  { key: "planes_susc", label: "Suscripciones de planes" },
  { key: "planes_ent", label: "Entregas de planes" },
  { key: "unidades", label: "Unidades (gastos comunes)" },
  { key: "repuestos", label: "Repuestos" },
  { key: "posventa", label: "Servicios / Posventa" },
  { key: "admin", label: "Administración (indirectos)" },
  { key: "financiero", label: "Resultados financieros" },
  { key: "varios", label: "Resultados varios" },
];

// Cuentas de Plan de Ahorro (516) que corresponden a "Entregas" (adjudicaciones);
// el resto de las 516 son "Suscripciones". El corte NO sale del código (hay
// entregas en 5161 y suscripciones en 5162): es una regla de negocio del grupo.
// Se matchea por prefijo, así toma también las subcuentas.
const ENTREGAS_PLANES = ["516120"];

export function deptoDeCuenta(codigo: string): string | null {
  const c = codigo.trim();
  if (!c.startsWith("5")) return null; // solo cuentas de resultado
  if (c.startsWith("511") || c.startsWith("513")) return "0km";
  if (c.startsWith("512") || c.startsWith("514")) return "usados";
  if (c.startsWith("516")) return ENTREGAS_PLANES.some((p) => c.startsWith(p)) ? "planes_ent" : "planes_susc"; // planes de ahorro: Entregas por cuenta, resto Suscripciones
  if (c.startsWith("517")) return "0km"; // financiación de vehículos → otros ingresos 0km
  if (c.startsWith("51")) return "unidades"; // 515/518/519 gastos comunes del depto
  if (c.startsWith("52")) return "repuestos";
  if (c.startsWith("53")) return "posventa";
  if (c.startsWith("55")) return "admin";
  if (c.startsWith("56")) return "financiero";
  if (c.startsWith("57") || c.startsWith("58")) return "varios";
  return null;
}

/** ¿El depto es alguno de los dos de Planes de Ahorro (suscripciones/entregas)? */
export const esPlanes = (depto: string) => depto === "planes_susc" || depto === "planes_ent";

function num(v: unknown): number {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.-]/g, ""));
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
  const col = Number(m[1]);
  let anio = Number(m[2].replace(/\./g, ""));
  if (!col || col > 13 || anio < 1900) return null;
  // El export de Oliauto rotula las columnas corridas en +1 respecto del mes
  // real: "2/2026" = enero 2026, …, "6/2026" = mayo. Verificado cuenta por
  // cuenta contra el libro mayor (306/306 coincidencias exactas por mes).
  let mes = col - 1;
  if (mes === 0) {
    mes = 12;
    anio -= 1;
  }
  return `${anio}-${String(mes).padStart(2, "0")}`;
}

export interface CeldaPL {
  ingresos: number;
  costos: number;
  gastos: number;
  resultado: number;
  /** Porción variable de los gastos, según la clasificación del EEFF del grupo. */
  gastosVar?: number;
  /** Otros ingresos/egresos por depto (cuentas mixtas 516/517/524/534); neto, + = ingreso. */
  otrosIng?: number;
}

/** Gasto común de Unidades por subrubro: total y porción variable. */
export interface ComunRubro {
  nombre?: string;
  gastos: number;
  gastosVar: number;
}

/** Línea del cuadro a la que aporta una cuenta. */
export type LineaCuenta = "venta" | "costo" | "gvar" | "gfijo" | "otros";

/** Detalle por cuenta contable del balance parcial (para drill-down). */
export interface CuentaBP {
  codigo: string;
  nombre: string;
  depto: string;
  linea: LineaCuenta;
  /** Impacto en resultado por período (+ ingreso · − gasto), como en el cuadro. */
  valores: Record<string, number>;
}

export interface BalanceParcial {
  periodos: string[];
  /** resultado[deptoKey][periodo] */
  porDepto: Record<string, Record<string, CeldaPL>>;
  /** total[periodo] */
  totales: Record<string, CeldaPL>;
  cuentasProcesadas: number;
  /** Gastos comunes de Unidades por período y subrubro (6 dígitos), para prorrateo. */
  comunesUnidades?: Record<string, Record<string, ComunRubro>>;
  /** Detalle por cuenta contable (código, nombre, línea y valores por período). */
  cuentas?: CuentaBP[];
}

function celdaVacia(): CeldaPL {
  return { ingresos: 0, costos: 0, gastos: 0, resultado: 0, gastosVar: 0, otrosIng: 0 };
}

/** Una celda con pinta de número ("0.00", "-1,244,762.94", 1234.5…). */
const RE_NUMERICA = /^-?[\d.,]+$/;
function esCeldaNumerica(v: unknown): boolean {
  const s = String(v ?? "").trim();
  return s !== "" && RE_NUMERICA.test(s);
}

/** Columna de descripción (texto) a la derecha de las 12 columnas mensuales. */
function columnaDescripcion(aoa: unknown[][]): number {
  for (let r = 0; r < Math.min(aoa.length, 80); r++) {
    const row = aoa[r];
    if (!Array.isArray(row)) continue;
    if (!deptoDeCuenta(String(row[0] ?? "").trim())) continue;
    for (let c = row.length - 1; c > 12; c--) {
      const s = String(row[c] ?? "").trim();
      if (s && !RE_NUMERICA.test(s)) return c;
    }
  }
  return 14;
}

/**
 * ¿El archivo parece un balance parcial de Oliauto SIN rótulos de mes?
 * Es el export "BalanceParcial_NN.rpt" → Excel: código de cuenta en la col. A,
 * los 12 meses (ene–dic) en B–M por posición, el total en N y la descripción en
 * O, sin ninguna fila de encabezado con los períodos. Lo reconocemos por el
 * cuerpo: filas con código de cuenta de resultado y ~12 columnas numéricas.
 */
export function pareceBalanceParcialSinRotulos(aoa: unknown[][]): boolean {
  let ok = 0;
  for (let r = 0; r < Math.min(aoa.length, 120); r++) {
    const row = aoa[r];
    if (!Array.isArray(row)) continue;
    if (!deptoDeCuenta(String(row[0] ?? "").trim())) continue;
    let numericas = 0;
    for (let c = 1; c <= 12; c++) if (esCeldaNumerica(row[c])) numericas++;
    if (numericas >= 10 && ++ok >= 5) return true;
  }
  return false;
}

const MES_NUM: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7,
  agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

/** Fecha de emisión del pie del reporte ("Emitido el … de junio de 2026"). null si no aparece. */
export function emisionDeReporte(aoa: unknown[][]): { anio: number; mes: number } | null {
  for (let r = aoa.length - 1; r >= Math.max(0, aoa.length - 8); r--) {
    const row = aoa[r];
    if (!Array.isArray(row)) continue;
    const txt = row.map((c) => String(c ?? "")).join(" ").toLowerCase();
    const m = txt.match(
      /de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+de\s+(20\d{2})/,
    );
    if (m) return { anio: Number(m[2]), mes: MES_NUM[m[1]] };
  }
  return null;
}

/** Año del pie del reporte de Oliauto. null si no aparece. */
export function anioDeReporte(aoa: unknown[][]): number | null {
  const e = emisionDeReporte(aoa);
  if (e) return e.anio;
  for (let r = aoa.length - 1; r >= Math.max(0, aoa.length - 8); r--) {
    const row = aoa[r];
    if (!Array.isArray(row)) continue;
    const txt = row.map((c) => String(c ?? "")).join(" ");
    const m = txt.match(/\b(20\d{2})\b/);
    if (m) {
      const y = Number(m[1]);
      if (y >= 2000 && y <= 2100) return y;
    }
  }
  return null;
}

/** Meses (1–12) con movimiento en un balance parcial sin rótulos. */
export function mesesConDatosBalanceParcial(aoa: unknown[][]): number[] {
  const cuentas = aoa.filter((row): row is unknown[] => Array.isArray(row) && !!deptoDeCuenta(String(row[0] ?? "").trim()));
  const meses: number[] = [];
  for (let m = 1; m <= 12; m++) if (cuentas.some((row) => num(row[m]) !== 0)) meses.push(m);
  return meses;
}

/**
 * Normaliza un balance parcial SIN rótulos al layout canónico que entienden los
 * parsers: encabezado [Código, Descripción, m1…mN] con los meses rotulados al
 * estilo Oliauto ("2/aaaa" = enero, "3/aaaa" = febrero, …). Incluye solo los meses
 * con datos hasta `mesCorte`; por default corta en el último mes COMPLETO, que es
 * el mes de emisión menos uno (un balance emitido el 15/jun cierra en mayo).
 * Devuelve null si el archivo no tiene ese layout.
 */
export function normalizarBalanceParcialSinRotulos(
  aoa: unknown[][],
  anio: number,
  mesCorte?: number,
): unknown[][] | null {
  if (!pareceBalanceParcialSinRotulos(aoa)) return null;
  const iDesc = columnaDescripcion(aoa);
  const cuentas = aoa.filter((row): row is unknown[] => Array.isArray(row) && !!deptoDeCuenta(String(row[0] ?? "").trim()));
  const emision = emisionDeReporte(aoa);
  const corte = mesCorte ?? (emision ? Math.max(1, emision.mes - 1) : 12);
  const conDatos = (m: number) => cuentas.some((row) => num(row[m]) !== 0);
  const meses: number[] = [];
  for (let m = 1; m <= Math.min(12, corte); m++) if (conDatos(m)) meses.push(m);
  // Si el corte dejó todo afuera, caemos a todos los meses con datos.
  if (meses.length === 0) for (let m = 1; m <= 12; m++) if (conDatos(m)) meses.push(m);
  // Oliauto rotula las columnas corridas +1: la columna de enero se rotula "2/aaaa".
  const header: unknown[] = ["Código", "Descripción", ...meses.map((m) => `${m + 1}/${anio}`)];
  const filas: unknown[][] = [header];
  for (const row of cuentas) {
    filas.push([String(row[0] ?? "").trim(), String(row[iDesc] ?? "").trim(), ...meses.map((m) => row[m] ?? 0)]);
  }
  return filas;
}

/**
 * Procesa un "balance parcial" de Oliauto (código + descripción + columnas mensuales).
 * Las ventas figuran con saldo acreedor (negativo), por eso el resultado se invierte.
 */
export function parseBalanceParcial(aoa: unknown[][], headerRow: number): BalanceParcial {
  // Si el archivo no trae rótulos de mes pero tiene el layout posicional de
  // Oliauto, lo normalizamos (año del pie del reporte) para reusar la misma
  // lógica de siempre. Si ya viene normalizado/rotulado, esto no hace nada.
  const hdr0 = (aoa[headerRow - 1] ?? []) as unknown[];
  if (!hdr0.some((h) => parsePeriodo(String(h)))) {
    const norm = normalizarBalanceParcialSinRotulos(aoa, anioDeReporte(aoa) ?? new Date().getUTCFullYear());
    if (norm) {
      aoa = norm;
      headerRow = 1;
    }
  }
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
  // Gastos comunes del depto Unidades (515) desglosados por subrubro (6 dígitos)
  // y período, para poder prorratearlos con reglas distintas por rubro.
  const comunesUnidades: Record<string, Record<string, ComunRubro>> = {};

  let cuentasProcesadas = 0;
  const cuentas: CuentaBP[] = [];
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
    const nombre = String(row?.[iCod + 1] ?? "").trim();
    let detalle: CuentaBP | null = null;
    for (const { idx, periodo } of colPeriodo) {
      const val = num(row?.[idx]);
      if (val === 0) continue;
      const cd = porDepto[depto][periodo];
      const tot = totales[periodo];
      // Línea del cuadro de esta cuenta en este período (para el drill-down).
      let linea: LineaCuenta;
      if (nat === "venta") { cd.ingresos += -val; tot.ingresos += -val; linea = "venta"; }
      else if (nat === "costo") { cd.costos += val; tot.costos += val; linea = "costo"; }
      else if (nat === "mixto" && esPlanes(depto)) {
        // En Planes de Ahorro las comisiones/incentivos (acreedoras) son la venta
        // del depto; los débitos (sellos, derechos, etc.) van a gastos.
        if (val < 0) { cd.ingresos += -val; tot.ingresos += -val; linea = "venta"; }
        else { cd.gastos += val; tot.gastos += val; linea = "gfijo"; }
      } else if (nat === "mixto") {
        // Otros ingresos/egresos por depto: neto (acreedor = ingreso positivo).
        cd.otrosIng = (cd.otrosIng ?? 0) + -val;
        tot.otrosIng = (tot.otrosIng ?? 0) + -val;
        linea = "otros";
      } else {
        cd.gastos += val;
        tot.gastos += val;
        // Apertura variable/fijo según la clasificación del EEFF del grupo.
        const esVar = clasificarGasto(codigo) === "variable";
        linea = esVar ? "gvar" : "gfijo";
        if (esVar) {
          cd.gastosVar = (cd.gastosVar ?? 0) + val;
          tot.gastosVar = (tot.gastosVar ?? 0) + val;
        }
        // Desglose por subrubro de los gastos comunes de Unidades (para prorratear).
        if (depto === "unidades") {
          const rub = codigo.trim().slice(0, 6);
          const porPer = (comunesUnidades[periodo] ??= {});
          const c = (porPer[rub] ??= { gastos: 0, gastosVar: 0, nombre });
          c.gastos += val;
          if (esVar) c.gastosVar += val;
        }
      }
      cd.resultado += -val;
      tot.resultado += -val;
      if (!detalle) {
        detalle = { codigo, nombre, depto, linea, valores: {} };
        cuentas.push(detalle);
      }
      detalle.valores[periodo] = (detalle.valores[periodo] ?? 0) + -val;
    }
  }

  return { periodos, porDepto, totales, cuentasProcesadas, comunesUnidades, cuentas };
}

/** ¿El archivo parece un balance parcial de Oliauto (tiene columnas mensuales)? */
export function pareceBalanceParcial(header: unknown[]): boolean {
  return header.filter((h) => parsePeriodo(String(h))).length >= 2;
}

// ============ Detección de empresa por contenido ============

export interface EmpresaHint {
  id: string;
  nombre: string;
  marcas: string[];
}

export interface DeteccionEmpresa {
  empresaId: string | null;
  confianza: "alta" | "media" | "baja";
}

/**
 * Intenta identificar a qué empresa pertenece un reporte, buscando en el texto
 * del archivo las marcas (Ford, Volkswagen, …) y tokens del nombre (Fiorasi,
 * Corradi, Sapac). Es orientativo: el usuario siempre puede corregirlo.
 */
export function detectarEmpresa(aoa: unknown[][], empresas: EmpresaHint[]): DeteccionEmpresa {
  const texto = aoa
    .slice(0, 500)
    .map((r) => (Array.isArray(r) ? r.join(" ") : ""))
    .join(" ")
    .toUpperCase();

  const score: Record<string, number> = {};
  for (const e of empresas) {
    let s = 0;
    for (const m of e.marcas) {
      if (m && texto.includes(m.toUpperCase())) s += 1;
    }
    for (const tok of e.nombre.toUpperCase().split(/\s+/)) {
      if (tok.length >= 5 && texto.includes(tok)) s += 2; // FIORASI, CORRADI, MOTORS…
    }
    score[e.id] = s;
  }

  const orden = Object.entries(score).sort((a, b) => b[1] - a[1]);
  if (orden.length === 0 || orden[0][1] === 0) return { empresaId: null, confianza: "baja" };

  const [mejorId, mejor] = orden[0];
  const segundo = orden[1]?.[1] ?? 0;
  const confianza = mejor >= segundo + 2 ? "alta" : "media";
  return { empresaId: mejorId, confianza };
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
  /** Saldo deudor por día de antigüedad (índice = días; 365 acumula 365+). */
  histograma: number[];
  totalDeudor: number;
  totalAcreedor: number;
  clientesDeudores: number;
  topDeudores: DeudorTop[];
}

/** Longitud del histograma de antigüedad (índice 365 = "365 o más"). */
export const HISTO_MAX = 365;

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
  const histograma = new Array<number>(HISTO_MAX + 1).fill(0);
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
      histograma[Math.max(0, Math.min(Math.round(age), HISTO_MAX))] += cg.amt;
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
    histograma,
    totalDeudor,
    totalAcreedor,
    clientesDeudores,
    topDeudores: top.slice(0, 10),
  };
}

// ============ Balance general / Sumas y saldos ============

export interface RubroBG {
  codigo: string;
  nombre: string;
  saldo: number; // en signo de presentación (siempre positivo)
}

export interface BalanceGeneral {
  activo: number;
  activoCorriente: number;
  activoNoCorriente: number;
  pasivo: number;
  pasivoCorriente: number;
  pasivoNoCorriente: number;
  patrimonioNeto: number;
  resultadoEjercicio: number; // ganancia en positivo (clase 5 invertida)
  rubrosActivo: RubroBG[];
  rubrosPasivo: RubroBG[];
  rubrosPN: RubroBG[];
  // Indicadores
  liquidezCorriente: number;
  capitalTrabajo: number;
  endeudamiento: number; // pasivo / patrimonio neto
  solvencia: number; // activo / pasivo
  // Diferencia de cuadre (Activo − (Pasivo + PN + Resultado)); idealmente ~0.
  descuadre: number;
  cuentasProcesadas: number;
}

/** ¿Parece un balance de sumas y saldos? (Código + Descripción + Saldo, sin columnas mensuales) */
export function pareceBalanceGeneral(header: unknown[]): boolean {
  const h = header.map((x) => String(x).trim().toLowerCase());
  const tieneSaldo = h.some((x) => x === "saldo" || x === "importe");
  const tieneCodigo = h.some((x) => x.startsWith("codigo") || x.startsWith("código") || x === "cuenta");
  const tieneDescrip = h.some((x) => x.startsWith("descrip") || x === "detalle");
  return tieneSaldo && tieneCodigo && tieneDescrip && !pareceBalanceParcial(header);
}

/**
 * Procesa un balance de sumas y saldos de Oliauto (plan de cuentas jerárquico:
 * 1 Activo · 2 Pasivo · 3 Patrimonio neto · 5 Resultados). El saldo deudor es
 * positivo y el acreedor negativo, por eso pasivo, PN y resultado se invierten.
 */
export function parseBalanceGeneral(aoa: unknown[][], headerRow: number): BalanceGeneral {
  const header = (aoa[headerRow - 1] ?? []) as unknown[];
  const iCod = header.findIndex((h) => /cod|cuenta/i.test(String(h)));
  const iNom = header.findIndex((h) => /descrip|nombre|detalle/i.test(String(h)));
  const iSal = header.findIndex((h) => /saldo|importe/i.test(String(h)));
  const cCod = iCod >= 0 ? iCod : 0;
  const cNom = iNom >= 0 ? iNom : 1;
  const cSal = iSal >= 0 ? iSal : 2;

  const saldoDe: Record<string, number> = {};
  const rubrosActivo: RubroBG[] = [];
  const rubrosPasivo: RubroBG[] = [];
  const rubrosPN: RubroBG[] = [];
  let cuentasProcesadas = 0;

  for (let r = headerRow; r < aoa.length; r++) {
    const row = aoa[r] as unknown[];
    const codigo = String(row?.[cCod] ?? "").trim();
    if (!/^[0-9]+$/.test(codigo)) continue;
    const saldo = num(row?.[cSal]);
    saldoDe[codigo] = saldo;
    cuentasProcesadas++;
    if (codigo.length === 2) {
      const nombre = String(row?.[cNom] ?? "").trim();
      if (codigo[0] === "1") rubrosActivo.push({ codigo, nombre, saldo });
      else if (codigo[0] === "2") rubrosPasivo.push({ codigo, nombre, saldo: -saldo });
      else if (codigo[0] === "3") rubrosPN.push({ codigo, nombre, saldo: -saldo });
    }
  }

  const S = (c: string) => saldoDe[c] ?? 0;
  const activo = S("1");
  const activoCorriente = S("11");
  const activoNoCorriente = S("12") + S("13");
  const pasivo = -S("2");
  const pasivoCorriente = -S("21");
  const pasivoNoCorriente = -S("22");
  const patrimonioNeto = -S("3");
  const resultadoEjercicio = -S("5");

  return {
    activo,
    activoCorriente,
    activoNoCorriente,
    pasivo,
    pasivoCorriente,
    pasivoNoCorriente,
    patrimonioNeto,
    resultadoEjercicio,
    rubrosActivo,
    rubrosPasivo,
    rubrosPN,
    liquidezCorriente: pasivoCorriente ? activoCorriente / pasivoCorriente : 0,
    capitalTrabajo: activoCorriente - pasivoCorriente,
    endeudamiento: patrimonioNeto ? pasivo / patrimonioNeto : 0,
    solvencia: pasivo ? activo / pasivo : 0,
    descuadre: activo - (pasivo + patrimonioNeto + resultadoEjercicio),
    cuentasProcesadas,
  };
}

// ============ Mayor / Libro mayor detallado ============

export interface ResumenComprobante {
  tipo: string;
  movimientos: number;
  debe: number;
  haber: number;
}

export interface CuentaMayor {
  codigo: string;
  nombre: string;
  movimientos: number;
  debe: number;
  haber: number;
}

export interface Mayor {
  movimientos: number;
  totalDebe: number;
  totalHaber: number;
  cuentas: number;
  fechaMin: string;
  fechaMax: string;
  sinComprobante: number;
  porComprobante: ResumenComprobante[];
  topCuentas: CuentaMayor[];
  /** Resultado (clase 5) por mes 'YYYY-MM', para conciliar con el balance parcial. */
  resultadoPorMes: Record<string, number>;
}

/** ¿Parece un libro mayor de Oliauto? (Código cuenta + Asiento + Debe + Haber) */
export function pareceMayor(header: unknown[]): boolean {
  const h = header.map((x) => String(x).trim().toLowerCase());
  const has = (...t: string[]) => t.some((n) => h.some((x) => x === n || x.startsWith(n)));
  return has("codigo cuenta", "código cuenta") && has("asiento") && has("debe") && has("haber");
}

/**
 * Procesa un libro mayor de Oliauto. Los movimientos de cada cuenta vienen
 * precedidos por una fila de texto con el nombre de la cuenta. Agrega totales,
 * actividad por tipo de comprobante y las cuentas con más movimiento.
 */
export function parseMayor(aoa: unknown[][], headerRow: number): Mayor {
  const header = (aoa[headerRow - 1] ?? []) as unknown[];
  const col = (...nombres: string[]) =>
    header.findIndex((h) => nombres.some((n) => String(h).trim().toLowerCase().startsWith(n)));
  const iCod = Math.max(col("codigo cuenta", "código cuenta", "codigo", "cuenta"), 0);
  const iFecha = col("fecha");
  const iDebe = col("debe");
  const iHaber = col("haber");
  const iTipo = col("tipo comprobante");

  let totalDebe = 0;
  let totalHaber = 0;
  let movimientos = 0;
  let sinComprobante = 0;
  let fmin = Infinity;
  let fmax = 0;
  const porTipo = new Map<string, ResumenComprobante>();
  const porCuenta = new Map<string, CuentaMayor>();
  const resultadoPorMes: Record<string, number> = {};
  let nombrePendiente = "";

  for (let r = headerRow; r < aoa.length; r++) {
    const row = aoa[r] as unknown[];
    const codigo = String(row?.[iCod] ?? "").trim();
    if (!/^[0-9]+$/.test(codigo)) {
      // Fila de sección: guarda el nombre para la próxima cuenta.
      if (codigo) nombrePendiente = codigo;
      continue;
    }
    const debe = num(row?.[iDebe]);
    const haber = num(row?.[iHaber]);
    movimientos++;
    totalDebe += debe;
    totalHaber += haber;

    const f = num(row?.[iFecha]);
    if (f > 40000 && f < 60000) {
      if (f < fmin) fmin = f;
      if (f > fmax) fmax = f;
      // Resultado por mes (clase 5): el acreedor es ganancia, por eso se invierte.
      if (codigo.startsWith("5")) {
        const d = new Date(Date.UTC(1899, 11, 30 + Math.round(f)));
        const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        resultadoPorMes[k] = (resultadoPorMes[k] ?? 0) + (haber - debe);
      }
    }

    const tipoRaw = iTipo >= 0 ? String(row?.[iTipo] ?? "").trim() : "";
    const tipo = tipoRaw || "Sin comprobante";
    if (!tipoRaw) sinComprobante++;
    let t = porTipo.get(tipo);
    if (!t) porTipo.set(tipo, (t = { tipo, movimientos: 0, debe: 0, haber: 0 }));
    t.movimientos++;
    t.debe += debe;
    t.haber += haber;

    let c = porCuenta.get(codigo);
    if (!c) porCuenta.set(codigo, (c = { codigo, nombre: nombrePendiente || codigo, movimientos: 0, debe: 0, haber: 0 }));
    if (c.nombre === codigo && nombrePendiente) c.nombre = nombrePendiente;
    c.movimientos++;
    c.debe += debe;
    c.haber += haber;
  }

  const porComprobante = [...porTipo.values()].sort((a, b) => b.movimientos - a.movimientos);
  const topCuentas = [...porCuenta.values()]
    .sort((a, b) => b.debe + b.haber - (a.debe + a.haber))
    .slice(0, 12);

  return {
    movimientos,
    totalDebe,
    totalHaber,
    cuentas: porCuenta.size,
    fechaMin: fmin < Infinity ? serialAISO(fmin) : "",
    fechaMax: fmax > 0 ? serialAISO(fmax) : "",
    sinComprobante,
    porComprobante,
    topCuentas,
    resultadoPorMes,
  };
}

// ============ Ventas de unidades 0km (resultado por factura) ============

export interface FilaVenta {
  fecha: string;
  cliente: string;
  ficha: string;
  venta: number;
  costo: number;
  vendedor: string;
  sucursal: string;
}

export interface AgrupadoVenta {
  nombre: string;
  unidades: number;
  ventas: number;
  resultado: number;
}

export interface Ventas0km {
  unidades: number;
  ventas: number;
  costo: number;
  resultado: number;
  precioProm: number;
  margenPct: number;
  fechaMin: string;
  fechaMax: string;
  porSucursal: AgrupadoVenta[];
  porVendedor: AgrupadoVenta[];
}

function colVenta(header: unknown[], ...nombres: string[]): number {
  return header.findIndex((h) => nombres.some((n) => String(h).trim().toLowerCase() === n.toLowerCase()));
}

/** ¿El archivo parece el reporte de resultado de unidades 0km? */
export function pareceVentas0km(header: unknown[]): boolean {
  const h = header.map((x) => String(x).trim().toLowerCase());
  const tiene = (...n: string[]) => n.some((x) => h.includes(x));
  return tiene("venta") && tiene("costo") && tiene("vendedor") && tiene("sucursal");
}

export function parseVentas0km(aoa: unknown[][], headerRow: number): Ventas0km {
  const header = (aoa[headerRow - 1] ?? []) as unknown[];
  const cFecha = colVenta(header, "factura", "fecha");
  const cCli = colVenta(header, "cliente");
  const cFicha = colVenta(header, "ficha");
  const cVenta = colVenta(header, "venta");
  const cCosto = colVenta(header, "costo");
  const cVend = colVenta(header, "vendedor");
  const cSuc = colVenta(header, "sucursal");

  let ventas = 0;
  let costo = 0;
  let unidades = 0;
  let fmin = Infinity;
  let fmax = 0;
  const suc = new Map<string, AgrupadoVenta>();
  const vend = new Map<string, AgrupadoVenta>();

  const agreg = (m: Map<string, AgrupadoVenta>, nombre: string, v: number, r: number) => {
    let a = m.get(nombre);
    if (!a) m.set(nombre, (a = { nombre, unidades: 0, ventas: 0, resultado: 0 }));
    a.unidades++;
    a.ventas += v;
    a.resultado += r;
  };

  for (let r = headerRow; r < aoa.length; r++) {
    const row = aoa[r] as unknown[];
    const v = num(row?.[cVenta]);
    const c = num(row?.[cCosto]);
    if (!v && !c) continue;
    unidades++;
    ventas += v;
    costo += c;
    const f = num(row?.[cFecha]);
    if (f > 40000 && f < 60000) {
      if (f < fmin) fmin = f;
      if (f > fmax) fmax = f;
    }
    const res = v - c;
    agreg(suc, String(row?.[cSuc] ?? "").trim() || "(s/suc.)", v, res);
    agreg(vend, String(row?.[cVend] ?? "").trim() || "(s/vend.)", v, res);
  }

  const porSucursal = [...suc.values()].sort((a, b) => b.ventas - a.ventas);
  const porVendedor = [...vend.values()].sort((a, b) => b.ventas - a.ventas);
  const resultado = ventas - costo;

  return {
    unidades,
    ventas,
    costo,
    resultado,
    precioProm: unidades ? ventas / unidades : 0,
    margenPct: ventas ? (resultado / ventas) * 100 : 0,
    fechaMin: fmin < Infinity ? serialAISO(fmin) : "",
    fechaMax: fmax > 0 ? serialAISO(fmax) : "",
    porSucursal,
    porVendedor,
  };
}
