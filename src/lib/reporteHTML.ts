// Generador del Reporte Ejecutivo de Gestión (HTML imprimible → PDF).
// Produce un documento autocontenido con análisis por área y recomendaciones,
// derivadas por reglas a partir de los números importados.

export interface AreaReporte {
  nombre: string;
  ventas: number;
  costos: number;
  margen: number;
  gVar: number;
  contMarg: number;
  gFijos: number;
  otrosIng: number;
  benef: number;
  partBenef: number;
  deltaResultado: number | null;
}

export interface ReporteData {
  empresa: string;
  periodoLabel: string;
  modoLabel: string;
  ventasTot: number;
  margenTot: number;
  contMargTot: number;
  resultadoFinal: number;
  puntoEq: number;
  margenSeg: number;
  areas: AreaReporte[];
  noOp: { label: string; resultado: number }[];
  unidades0km?: { unidades: number; precioProm: number };
  mora?: { total: number; pctMora: number; mas90: number };
  patrimonial?: { activo: number; pasivo: number; pn: number; liquidez: number; solvencia: number; endeudamiento: number };
}

const ar = (n: number) => new Intl.NumberFormat("es-AR").format(Math.round(n || 0));
const arM = (n: number) => {
  const abs = Math.abs(n || 0);
  const s = n < 0 ? "-" : "";
  if (abs >= 1e6) return `${s}$ ${(abs / 1e6).toLocaleString("es-AR", { maximumFractionDigits: 1 })} M`;
  if (abs >= 1e3) return `${s}$ ${(abs / 1e3).toFixed(0)} K`;
  return `${s}$ ${abs.toFixed(0)}`;
};
const pc = (n: number, base: number, dec = 1) => (base ? `${((n / base) * 100).toLocaleString("es-AR", { maximumFractionDigits: dec })}%` : "—");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Comentario + recomendaciones por área, según reglas de negocio. */
function analizarArea(a: AreaReporte, ventasTot: number): { coment: string[]; recos: string[] } {
  const coment: string[] = [];
  const recos: string[] = [];
  const margenPct = a.ventas ? (a.margen / a.ventas) * 100 : 0;
  const cmPct = a.ventas ? (a.contMarg / a.ventas) * 100 : 0;
  const gVarPct = a.ventas ? (-a.gVar / a.ventas) * 100 : 0;

  if (a.ventas > 0) {
    coment.push(
      `Facturó ${arM(a.ventas)} (${pc(a.ventas, ventasTot)} de la facturación) con un margen bruto de ${margenPct.toLocaleString("es-AR", { maximumFractionDigits: 1 })}%.`,
    );
  }
  coment.push(
    `Aportó un beneficio de ${arM(a.benef)}, equivalente al ${a.partBenef.toLocaleString("es-AR", { maximumFractionDigits: 0 })}% del beneficio operativo total.`,
  );
  if (a.otrosIng) {
    coment.push(`Incluye otros ingresos/egresos por ${arM(a.otrosIng)} (financiación, gestoría, bonificaciones).`);
  }
  if (a.deltaResultado !== null && Math.abs(a.deltaResultado) > a.ventas * 0.01) {
    coment.push(
      a.deltaResultado >= 0
        ? `Mejoró ${arM(a.deltaResultado)} respecto del período anterior.`
        : `Cayó ${arM(Math.abs(a.deltaResultado))} respecto del período anterior.`,
    );
  }

  // Recomendaciones por reglas
  if (a.benef < 0) {
    recos.push(`El área opera a pérdida (${arM(a.benef)}): revisar estructura de costos fijos y política de precios.`);
  }
  if (a.ventas > 0 && margenPct < 12) {
    recos.push(`Margen bruto bajo (${margenPct.toFixed(1)}%): analizar descuentos otorgados y costo de adquisición.`);
  }
  if (gVarPct > 8) {
    recos.push(`Alta incidencia de gastos variables (${gVarPct.toFixed(1)}% s/ventas): revisar comisiones, fletes y preparación.`);
  }
  if (a.ventas > 0 && cmPct > 0 && cmPct < 5) {
    recos.push(`Contribución marginal ajustada (${cmPct.toFixed(1)}%): el área aporta poco a cubrir la estructura.`);
  }
  if (a.deltaResultado !== null && a.deltaResultado < -a.ventas * 0.03) {
    recos.push(`Deterioro relevante vs. período anterior: identificar la causa (volumen, precio o gasto).`);
  }
  return { coment, recos };
}

export function abrirReporteEjecutivo(d: ReporteData): void {
  const margenPct = d.ventasTot ? (d.margenTot / d.ventasTot) * 100 : 0;
  const resultPct = d.ventasTot ? (d.resultadoFinal / d.ventasTot) * 100 : 0;

  // ---- Recomendaciones generales ----
  const recosGen: string[] = [];
  if (d.margenSeg < 15) recosGen.push(`Margen de seguridad ajustado (${d.margenSeg.toFixed(1)}%): la facturación está cerca del punto de equilibrio (${arM(d.puntoEq)}). Cuidar el nivel de actividad.`);
  if (d.resultadoFinal < 0) recosGen.push(`El resultado del período es negativo: priorizar reducción de gastos de estructura y mejora de contribución.`);
  const estruct = d.noOp.find((n) => /estructura/i.test(n.label));
  if (estruct && d.ventasTot && Math.abs(estruct.resultado) / d.ventasTot > 0.04) {
    recosGen.push(`Los gastos de estructura representan ${pc(-estruct.resultado, d.ventasTot)} de las ventas: evaluar oportunidades de eficiencia administrativa.`);
  }
  if (d.mora && d.mora.pctMora > 25) {
    recosGen.push(`Mora elevada (${d.mora.pctMora.toFixed(1)}%, ${arM(d.mora.mas90)} a +90 días): reforzar gestión de cobranzas y políticas de crédito.`);
  }
  if (d.patrimonial && d.patrimonial.liquidez < 1) {
    recosGen.push(`Liquidez corriente por debajo de 1 (${d.patrimonial.liquidez.toFixed(2)}): atención al capital de trabajo.`);
  }
  if (d.patrimonial && d.patrimonial.endeudamiento > 1) {
    recosGen.push(`Endeudamiento alto (${d.patrimonial.endeudamiento.toFixed(2)} pasivo/PN): monitorear costo financiero.`);
  }
  const mejorArea = [...d.areas].sort((a, b) => b.benef - a.benef)[0];
  const peorArea = [...d.areas].sort((a, b) => a.benef - b.benef)[0];
  if (mejorArea) recosGen.push(`El motor del resultado es ${mejorArea.nombre} (${arM(mejorArea.benef)}). Sostener volumen y margen de esa línea.`);
  if (peorArea && peorArea.benef < mejorArea.benef * 0.15) recosGen.push(`${peorArea.nombre} es la línea más débil (${arM(peorArea.benef)}): definir plan de acción específico.`);

  // ---- Secciones por área ----
  const areasHTML = d.areas.map((a) => {
    const { coment, recos } = analizarArea(a, d.ventasTot);
    const u = a.nombre.includes("0km") && d.unidades0km
      ? `<span class="badge">${ar(d.unidades0km.unidades)} u. · ${arM(d.unidades0km.precioProm)} prom.</span>` : "";
    return `
    <div class="area">
      <div class="area-h"><h3>${esc(a.nombre)} ${u}</h3>
        <span class="area-benef ${a.benef < 0 ? "neg" : "pos"}">${arM(a.benef)}</span></div>
      <table class="mini">
        <tr><td>Ventas</td><td class="n">${ar(a.ventas)}</td><td>Margen bruto</td><td class="n">${ar(a.margen)} <small>${pc(a.margen, a.ventas)}</small></td></tr>
        <tr><td>Gtos. variables</td><td class="n ${a.gVar < 0 ? "neg" : ""}">${ar(a.gVar)}</td><td>Contrib. marginal</td><td class="n">${ar(a.contMarg)} <small>${pc(a.contMarg, a.ventas)}</small></td></tr>
        <tr><td>Gtos. fijos asig.</td><td class="n ${a.gFijos < 0 ? "neg" : ""}">${ar(a.gFijos)}</td><td>Otros ing./egr.</td><td class="n ${a.otrosIng < 0 ? "neg" : ""}">${ar(a.otrosIng)}</td></tr>
      </table>
      <p class="coment">${coment.map(esc).join(" ")}</p>
      ${recos.length ? `<div class="recos"><b>Recomendaciones</b><ul>${recos.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></div>` : ""}
    </div>`;
  }).join("");

  const patrHTML = d.patrimonial ? `
    <div class="panel">
      <h2>Situación patrimonial</h2>
      <div class="grid4">
        <div class="mini-kpi"><span>Activo</span><b>${arM(d.patrimonial.activo)}</b></div>
        <div class="mini-kpi"><span>Pasivo</span><b>${arM(d.patrimonial.pasivo)}</b></div>
        <div class="mini-kpi"><span>Patrimonio neto</span><b>${arM(d.patrimonial.pn)}</b></div>
        <div class="mini-kpi"><span>Liquidez / Solvencia / Endeud.</span><b>${d.patrimonial.liquidez.toFixed(2)} · ${d.patrimonial.solvencia.toFixed(2)} · ${d.patrimonial.endeudamiento.toFixed(2)}</b></div>
      </div>
    </div>` : "";

  const moraHTML = d.mora ? `
    <div class="panel">
      <h2>Cuentas corrientes</h2>
      <p class="coment">Cartera deudora de ${arM(d.mora.total)}, con ${d.mora.pctMora.toFixed(1)}% vencido y ${arM(d.mora.mas90)} a más de 90 días.</p>
    </div>` : "";

  const html = `<!doctype html><html lang="es-AR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Reporte de Gestión — ${esc(d.empresa)} — ${esc(d.periodoLabel)}</title>
<style>
  :root{--ink:#10243e;--body:#2b3a4a;--muted:#7a8794;--line:#e3e8ed;--accent:#2b2a80;--soft:#eef0f8;--pos:#117a52;--neg:#c0302b;--band:#f5f6fa}
  *{box-sizing:border-box}body{margin:0;background:#eef1f4;color:var(--body);font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;font-variant-numeric:tabular-nums;line-height:1.45;padding:22px}
  .sheet{max-width:900px;margin:0 auto}
  .n{text-align:right;white-space:nowrap}.neg{color:var(--neg)}.pos{color:var(--pos)}
  .top{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:14px}
  .eyebrow{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);font-weight:800}
  h1{margin:2px 0 0;font-size:24px;color:var(--ink);letter-spacing:-.01em}
  .scope{margin-top:6px;color:var(--muted);font-size:13px}
  .btn{border:1px solid var(--accent);background:var(--accent);color:#fff;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer}
  .kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:14px}
  .kpi{background:#fff;border:1px solid var(--line);border-radius:11px;padding:12px}
  .kpi .l{font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:700}
  .kpi .v{font-size:19px;font-weight:800;color:var(--ink);margin-top:4px}
  .kpi .s{font-size:11px;color:var(--muted);margin-top:2px}
  .kpi.feat{background:var(--accent);border-color:var(--accent)}.kpi.feat .l{color:#b9b9e6}.kpi.feat .v,.kpi.feat .s{color:#fff}
  .panel{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:14px}
  .panel h2{margin:0 0 10px;font-size:14px;text-transform:uppercase;letter-spacing:.02em;color:var(--ink)}
  .lead{font-size:13.5px}
  .area{border:1px solid var(--line);border-radius:11px;padding:13px 15px;margin-bottom:12px;break-inside:avoid}
  .area-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
  .area-h h3{margin:0;font-size:15px;color:var(--ink)}
  .area-benef{font-weight:800;font-size:16px}
  .badge{display:inline-block;font-size:11px;background:var(--soft);color:var(--accent);border-radius:999px;padding:2px 9px;margin-left:6px;font-weight:600}
  table.mini{width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:8px}
  table.mini td{padding:4px 8px;border-bottom:1px solid var(--band)}
  table.mini td:nth-child(odd){color:var(--muted)}
  table.mini small{color:var(--muted)}
  .coment{font-size:13px;margin:6px 0}
  .recos{background:var(--band);border-left:3px solid var(--accent);border-radius:6px;padding:8px 12px;margin-top:8px;font-size:12.5px}
  .recos ul{margin:5px 0 0;padding-left:18px}.recos li{margin:3px 0}
  .grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
  .mini-kpi{background:var(--band);border-radius:9px;padding:10px}.mini-kpi span{display:block;font-size:11px;color:var(--muted)}.mini-kpi b{font-size:15px;color:var(--ink)}
  .reco-gen li{margin:5px 0;font-size:13px}
  .foot{font-size:11px;color:var(--muted);text-align:center;margin-top:10px}
  @media print{body{background:#fff;padding:0}.btn{display:none}.panel,.kpi,.area{box-shadow:none}@page{size:A4;margin:12mm}}
</style></head><body><div class="sheet">
  <div class="top">
    <div><div class="eyebrow">Control &amp; Gestión · Grupo Fiorasi</div>
      <h1>Reporte de Gestión</h1>
      <div class="scope"><b>${esc(d.empresa)}</b> · ${esc(d.periodoLabel)} · ${esc(d.modoLabel)}</div></div>
    <button class="btn" onclick="window.print()">Imprimir / Guardar PDF</button>
  </div>

  <div class="kpis">
    <div class="kpi"><div class="l">Facturación</div><div class="v">${arM(d.ventasTot)}</div></div>
    <div class="kpi"><div class="l">Margen bruto</div><div class="v">${arM(d.margenTot)}</div><div class="s">${margenPct.toFixed(1)}% s/ventas</div></div>
    <div class="kpi"><div class="l">Contrib. marginal</div><div class="v">${arM(d.contMargTot)}</div><div class="s">${pc(d.contMargTot, d.ventasTot)}</div></div>
    <div class="kpi feat"><div class="l">Resultado</div><div class="v">${arM(d.resultadoFinal)}</div><div class="s">${resultPct.toFixed(1)}% s/ventas</div></div>
    <div class="kpi"><div class="l">Punto de equilibrio</div><div class="v">${arM(d.puntoEq)}</div><div class="s">m. seguridad ${d.margenSeg.toFixed(1)}%</div></div>
  </div>

  <div class="panel">
    <h2>Resumen ejecutivo</h2>
    <p class="lead">En el período <b>${esc(d.periodoLabel)}</b>, ${esc(d.empresa)} registró una facturación de <b>${arM(d.ventasTot)}</b> y un resultado de <b>${arM(d.resultadoFinal)}</b> (${resultPct.toFixed(1)}% sobre ventas). El margen bruto fue de ${margenPct.toFixed(1)}% y la contribución marginal de ${pc(d.contMargTot, d.ventasTot)}. El punto de equilibrio se ubica en ${arM(d.puntoEq)}, con un margen de seguridad del ${d.margenSeg.toFixed(1)}%.</p>
  </div>

  <div class="panel">
    <h2>Análisis por área</h2>
    ${areasHTML}
  </div>

  ${patrHTML}
  ${moraHTML}

  <div class="panel">
    <h2>Recomendaciones generales</h2>
    <ul class="reco-gen">${recosGen.map((r) => `<li>${esc(r)}</li>`).join("") || "<li>Sin observaciones críticas en el período.</li>"}</ul>
  </div>

  <p class="foot">Generado automáticamente del balance importado · ${new Date().toLocaleString("es-AR")}. Las cifras reconcilian con el resultado del balance. Recomendaciones orientativas basadas en reglas de gestión.</p>
</div></body></html>`;

  const w = window.open("", "_blank");
  if (!w) {
    alert("Habilitá las ventanas emergentes para ver el reporte.");
    return;
  }
  w.document.write(html);
  w.document.close();
}
