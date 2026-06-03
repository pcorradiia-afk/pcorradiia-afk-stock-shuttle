// Código de selección (nuestro) -> código ISO para las imágenes de bandera
// (flagcdn.com). Reino Unido usa subdivisiones: gb-eng / gb-sct / gb-wls.
export const ISO2: Record<string, string> = {
  // Participantes Mundial 2026
  MEX: "mx", KOR: "kr", RSA: "za", CZE: "cz",
  CAN: "ca", SUI: "ch", QAT: "qa", BIH: "ba",
  BRA: "br", MAR: "ma", SCO: "gb-sct", HAI: "ht",
  USA: "us", AUS: "au", PAR: "py", TUR: "tr",
  GER: "de", ECU: "ec", CIV: "ci", CUW: "cw",
  NED: "nl", JPN: "jp", TUN: "tn", SWE: "se",
  BEL: "be", IRN: "ir", EGY: "eg", NZL: "nz",
  ESP: "es", URU: "uy", KSA: "sa", CPV: "cv",
  FRA: "fr", SEN: "sn", NOR: "no", IRQ: "iq",
  ARG: "ar", AUT: "at", ALG: "dz", JOR: "jo",
  POR: "pt", COL: "co", UZB: "uz", COD: "cd",
  ENG: "gb-eng", CRO: "hr", PAN: "pa", GHA: "gh",
  // Otros (por si se usan en algún listado)
  VEN: "ve", BOL: "bo", ITA: "it", DEN: "dk", POL: "pl",
  WAL: "gb-wls", NGA: "ng", CRC: "cr", JAM: "jm",
};

export const flagUrl = (code: string): string | null => {
  const iso = ISO2[code];
  return iso ? `https://flagcdn.com/w160/${iso}.png` : null;
};
