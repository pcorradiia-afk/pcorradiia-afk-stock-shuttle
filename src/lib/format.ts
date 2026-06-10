// Formateadores para Argentina: $ peso argentino, fechas dd/mm/aaaa.

const ARS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const ARS_DEC = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

const NUM = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

/** $ 1.234.567 */
export function money(n: number, decimals = false): string {
  return (decimals ? ARS_DEC : ARS).format(n ?? 0);
}

/** Versión compacta para tarjetas: $ 1,2 M / $ 850 K */
export function moneyShort(n: number): string {
  const abs = Math.abs(n ?? 0);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$ ${(abs / 1_000_000).toFixed(1).replace(".", ",")} M`;
  if (abs >= 1_000) return `${sign}$ ${(abs / 1_000).toFixed(0)} K`;
  return `${sign}$ ${abs.toFixed(0)}`;
}

export function num(n: number): string {
  return NUM.format(n ?? 0);
}

export function pct(n: number, decimals = 1): string {
  return `${(n ?? 0).toFixed(decimals).replace(".", ",")}%`;
}

/** 'YYYY-MM' -> 'mmm aaaa' (ej: 'ene 2026') */
export function periodoLabel(periodo: string): string {
  const [y, m] = periodo.split("-").map(Number);
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${meses[(m ?? 1) - 1]} ${y}`;
}

/** Date -> dd/mm/aaaa */
export function fecha(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
