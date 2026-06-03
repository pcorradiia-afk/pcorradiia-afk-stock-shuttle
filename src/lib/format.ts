// Helpers de formato (plata y fechas) en español rioplatense.

export function formatMoney(amount: number, currency = "ARS"): string {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${Math.round(amount).toLocaleString("es-AR")}`;
  }
}

const DOW = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MON = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

export function formatKickoff(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]} · ${hh}:${mm}`;
}

export function formatDay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
}

export function isLocked(kickoffIso: string): boolean {
  return Date.now() >= new Date(kickoffIso).getTime();
}
