// Normalización de teléfonos argentinos a E.164 para WhatsApp (+549AAANNNNNNN).
// Compartido entre el navegador y la ruta de API (sin "use client").
//
// Casos que llegan de la cartera FIS: "2944417169", "0280154850868",
// "02920-15-709292", "+54 9 294 4417169", con 0 inicial y/o "15" intercalado.

export function normalizarTelefonoAR(crudo: string): string | null {
  let d = (crudo || "").replace(/\D/g, "");
  if (!d) return null;
  d = d.replace(/^0+/, ""); // 0 de discado nacional
  if (d.startsWith("549")) d = d.slice(3);
  else if (d.startsWith("54")) d = d.slice(2);
  // "15" de celular viejo tras el código de área (ej: 2920 15 709292 → 2920709292)
  d = d.replace(/^(\d{2,4})15(\d{6,8})$/, "$1$2");
  if (d.length < 10 || d.length > 11) return null; // área+abonado en AR = 10 dígitos
  if (d.length === 11 && d.startsWith("9")) d = d.slice(1);
  if (d.length !== 10) return null;
  return `+549${d}`;
}
