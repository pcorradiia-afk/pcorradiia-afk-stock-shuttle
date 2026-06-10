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

export type Naturaleza = "venta" | "costo" | "gasto";

/**
 * Naturaleza de la cuenta según el código de Oliauto (más confiable que la
 * descripción): dentro de cada departamento, el 3.º dígito indica ventas/costos/gastos.
 */
export function naturalezaDeCuenta(codigo: string): Naturaleza {
  const c = codigo.trim();
  // Unidades (51)
  if (/^51[128]/.test(c)) return "venta"; // 511 0km, 512 usados, 518 corporativas
  if (/^51[34]/.test(c)) return "costo"; // 513/514 costos
  if (/^51[567]/.test(c)) return "gasto"; // 515 gastos, 516/517 otros/financieros
  // Repuestos (52)
  if (/^521/.test(c)) return "venta";
  if (/^522/.test(c)) return "costo";
  if (/^52/.test(c)) return "gasto";
  // Servicios (53), con sub-depto Esquel (535) por 4.º dígito
  if (/^531/.test(c)) return "venta";
  if (/^532/.test(c)) return "costo";
  if (/^535/.test(c)) return c[3] === "1" ? "venta" : c[3] === "2" ? "costo" : "gasto";
  if (/^53/.test(c)) return "gasto";
  // Financieros y varios
  if (/^561/.test(c) || /^571/.test(c)) return "venta"; // ingresos
  return "gasto"; // 55 indirectos, 562/572 egresos, 58 otros
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
      if (nat === "venta") { cd.ingresos += -val; tot.ingresos += -val; }
      else if (nat === "costo") { cd.costos += val; tot.costos += val; }
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
