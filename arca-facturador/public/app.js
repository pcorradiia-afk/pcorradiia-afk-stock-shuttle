/* app.js — lógica del formulario local del ARCA Facturador. */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const api = async (url, opts) => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
};
const money = (n) => '$ ' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 });

let CONDICIONES_IVA = [];
let CLIENTES = [];

// ---- Tabs ----------------------------------------------------------------
$$('.tab').forEach((t) =>
  t.addEventListener('click', () => {
    $$('.tab').forEach((x) => x.classList.remove('active'));
    $$('.panel').forEach((x) => x.classList.remove('active'));
    t.classList.add('active');
    $('#' + t.dataset.tab).classList.add('active');
    if (t.dataset.tab === 'historial') cargarComprobantes();
    if (t.dataset.tab === 'emitir') renderLote();
  }),
);

// ---- Init ----------------------------------------------------------------
async function init() {
  try {
    const cfg = await api('/api/config');
    const badge = $('#ambiente');
    badge.textContent =
      (cfg.esProduccion ? '🔴 PRODUCCIÓN' : '🟢 HOMOLOGACIÓN') + ` · ${cfg.emisor.razonSocial}`;
    badge.classList.toggle('prod', cfg.esProduccion);
    $('#ajuste-redondeo').value = cfg.redondeoDefault;
  } catch (e) {
    $('#ambiente').textContent = '⚠ ' + e.message;
  }
  // Parámetros de ARCA (condición IVA). Si ARCA no responde, usamos una tabla base.
  try {
    const p = await api('/api/parametros');
    CONDICIONES_IVA = p.condicionesIvaReceptor?.length ? p.condicionesIvaReceptor : condicionesBase();
  } catch {
    CONDICIONES_IVA = condicionesBase();
  }
  await cargarClientes();
}
function condicionesBase() {
  return [
    { id: 5, desc: 'Consumidor Final' },
    { id: 6, desc: 'Responsable Monotributo' },
    { id: 1, desc: 'IVA Responsable Inscripto' },
    { id: 4, desc: 'IVA Sujeto Exento' },
  ];
}
function descCondIva(id) {
  return CONDICIONES_IVA.find((c) => Number(c.id) === Number(id))?.desc || 'Cond. ' + id;
}

// ---- Clientes ------------------------------------------------------------
async function cargarClientes() {
  CLIENTES = await api('/api/clientes');
  const cont = $('#lista-clientes');
  cont.innerHTML = '';
  if (!CLIENTES.length) {
    cont.innerHTML = '<p class="hint">Todavía no cargaste clientes. Empezá con “+ Nuevo cliente”.</p>';
    return;
  }
  for (const c of CLIENTES) {
    const total = (c.items || []).reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
    const div = document.createElement('div');
    div.className = 'card cliente-card';
    div.innerHTML = `
      <div>
        <strong>${esc(c.razon_social)}</strong>
        <div class="meta">
          <span class="tag">${docLabel(c.doc_tipo)} ${esc(c.doc_nro)}</span>
          <span class="tag">${esc(descCondIva(c.condicion_iva_id))}</span>
          <span class="tag">${c.email ? esc(c.email) : 'sin email'}</span>
        </div>
        <div class="meta">${(c.items || []).length} ítem(s) · total ${money(total)}</div>
      </div>
      <div>
        <button class="ghost" onclick="editarCliente(${c.id})">Editar</button>
        <button class="ghost" onclick="borrarCliente(${c.id})">Baja</button>
      </div>`;
    cont.appendChild(div);
  }
}
function docLabel(t) {
  return t === 80 ? 'CUIT' : t === 96 ? 'DNI' : t === 86 ? 'CUIL' : 'Doc';
}

// Modal cliente
function abrirModalCliente(cliente) {
  $('#modal-titulo').textContent = cliente ? 'Editar cliente' : 'Nuevo cliente';
  $('#cli-id').value = cliente?.id || '';
  $('#cli-razon').value = cliente?.razon_social || '';
  $('#cli-doctipo').value = cliente?.doc_tipo || 80;
  $('#cli-docnro').value = cliente?.doc_nro || '';
  $('#cli-email').value = cliente?.email || '';
  $('#cli-concepto').value = cliente?.concepto || 1;
  const sel = $('#cli-condiva');
  sel.innerHTML = CONDICIONES_IVA.map((c) => `<option value="${c.id}">${esc(c.desc)}</option>`).join('');
  sel.value = cliente?.condicion_iva_id || 6;
  const tb = $('#cli-items tbody');
  tb.innerHTML = '';
  (cliente?.items || [{ descripcion: '', cantidad: 1, precio_unitario: 0 }]).forEach(addItemRow);
  $('#modal-cliente').classList.remove('hidden');
}
function addItemRow(it = { descripcion: '', cantidad: 1, precio_unitario: 0 }) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="i-desc" value="${esc(it.descripcion)}" /></td>
    <td><input class="i-cant" type="number" step="0.01" value="${it.cantidad}" style="width:70px" /></td>
    <td><input class="i-precio" type="number" step="0.01" value="${it.precio_unitario}" style="width:110px" /></td>
    <td><button class="ghost" onclick="this.closest('tr').remove()">✕</button></td>`;
  $('#cli-items tbody').appendChild(tr);
}
function leerModalCliente() {
  const items = $$('#cli-items tbody tr')
    .map((tr) => ({
      descripcion: tr.querySelector('.i-desc').value.trim(),
      cantidad: parseFloat(tr.querySelector('.i-cant').value) || 0,
      precio_unitario: parseFloat(tr.querySelector('.i-precio').value) || 0,
    }))
    .filter((i) => i.descripcion);
  return {
    razon_social: $('#cli-razon').value.trim(),
    doc_tipo: Number($('#cli-doctipo').value),
    doc_nro: $('#cli-docnro').value.trim() || '0',
    condicion_iva_id: Number($('#cli-condiva').value),
    email: $('#cli-email').value.trim(),
    concepto: Number($('#cli-concepto').value),
    items,
  };
}
window.editarCliente = (id) => abrirModalCliente(CLIENTES.find((c) => c.id === id));
window.borrarCliente = async (id) => {
  if (!confirm('¿Dar de baja este cliente? (se conserva el historial de comprobantes)')) return;
  await api('/api/clientes/' + id, { method: 'DELETE' });
  cargarClientes();
};

$('#btn-nuevo-cliente').onclick = () => abrirModalCliente(null);
$('#btn-add-item').onclick = () => addItemRow();
$('#btn-cancelar-cliente').onclick = () => $('#modal-cliente').classList.add('hidden');
$('#btn-guardar-cliente').onclick = async () => {
  const body = leerModalCliente();
  if (!body.razon_social) return alert('Falta la razón social');
  const id = $('#cli-id').value;
  try {
    if (id) await api('/api/clientes/' + id, { method: 'PUT', body });
    else await api('/api/clientes', { method: 'POST', body });
    $('#modal-cliente').classList.add('hidden');
    cargarClientes();
  } catch (e) {
    alert('Error: ' + e.message);
  }
};

// ---- Ajustes -------------------------------------------------------------
$('#ajuste-modo').onchange = (e) => {
  const sel = e.target.value === 'seleccion';
  $('#selecciones').classList.toggle('hidden', !sel);
  $('#wrap-pct-global').classList.toggle('hidden', sel);
  if (sel && !$('#lista-selecciones').children.length) addSeleccion();
};
$('#btn-add-seleccion').onclick = () => addSeleccion();
function addSeleccion() {
  const div = document.createElement('div');
  div.className = 'card';
  const opts = CLIENTES.map((c) => `<option value="${c.id}">${esc(c.razon_social)}</option>`).join('');
  div.innerHTML = `
    <div class="grid">
      <label>Clientes (multi-selección)
        <select class="sel-clientes" multiple size="4">${opts}</select>
      </label>
      <label>% de aumento <input class="sel-pct" type="number" step="0.1" value="10" /></label>
    </div>
    <button class="ghost" onclick="this.closest('.card').remove()">Quitar selección</button>`;
  $('#lista-selecciones').appendChild(div);
}
function armarEntradaAjuste() {
  const modo = $('#ajuste-modo').value;
  const redondeo = $('#ajuste-redondeo').value;
  if (modo === 'global') {
    return { modo, redondeo, porcentajeGlobal: parseFloat($('#ajuste-pct-global').value) || 0 };
  }
  const selecciones = $$('#lista-selecciones .card').map((c) => ({
    clienteIds: [...c.querySelector('.sel-clientes').selectedOptions].map((o) => Number(o.value)),
    porcentaje: parseFloat(c.querySelector('.sel-pct').value) || 0,
  }));
  return { modo, redondeo, selecciones };
}
$('#btn-preview').onclick = async () => {
  const prev = await api('/api/ajustes/preview', { method: 'POST', body: armarEntradaAjuste() });
  renderPreview(prev);
};
function renderPreview(prev) {
  $('#preview-ajuste').classList.remove('hidden');
  let html = `<div class="card"><strong>Total libreta:</strong> ${money(prev.totalAnterior)} →
    <span class="diff-new">${money(prev.totalNuevo)}</span></div>`;
  for (const g of prev.porCliente) {
    const filas = g.lineas
      .map(
        (l) => `<tr><td>${esc(l.descripcion)}</td><td>${l.porcentaje}%</td>
        <td class="diff-old">${money(l.precio_anterior)}</td>
        <td class="diff-new">${money(l.precio_nuevo)}</td></tr>`,
      )
      .join('');
    html += `<div class="card"><strong>${esc(g.cliente_nombre)}</strong>
      <table><thead><tr><th>Ítem</th><th>%</th><th>Antes</th><th>Después</th></tr></thead>
      <tbody>${filas}</tbody></table></div>`;
  }
  $('#preview-contenido').innerHTML = html;
}
$('#btn-confirmar-ajuste').onclick = async () => {
  const guardar = $('#guardar-libreta').checked;
  const msg = guardar
    ? 'Se actualizarán los precios en la libreta (acumulativo). ¿Confirmás?'
    : 'Se registrará el ajuste SIN modificar la libreta. ¿Confirmás?';
  if (!confirm(msg)) return;
  const r = await api('/api/ajustes/confirmar', {
    method: 'POST',
    body: { entrada: armarEntradaAjuste(), guardarEnLibreta: guardar, descripcion: $('#ajuste-desc').value },
  });
  alert(`Ajuste registrado (#${r.ajusteId}). ${r.preview.lineas.length} ítem(s) modificados.`);
  $('#preview-ajuste').classList.add('hidden');
  cargarClientes();
};

// ---- Emitir --------------------------------------------------------------
function renderLote() {
  const cont = $('#lote');
  cont.innerHTML = '';
  if (!CLIENTES.length) {
    cont.innerHTML = '<p class="hint">Cargá clientes primero.</p>';
    return;
  }
  for (const c of CLIENTES) {
    const total = (c.items || []).reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <label class="check">
        <input type="checkbox" class="lote-check" data-id="${c.id}" checked />
        <strong>${esc(c.razon_social)}</strong> — ${(c.items || []).length} ítem(s) · ${money(total)}
      </label>`;
    cont.appendChild(div);
  }
}
$('#btn-emitir').onclick = async () => {
  const ids = $$('.lote-check:checked').map((x) => Number(x.dataset.id));
  if (!ids.length) return alert('Seleccioná al menos un cliente.');
  const dryRun = $('#emitir-dryrun').checked;
  const enviarEmail = $('#emitir-email').checked;
  const periodo = $('#emitir-periodo').value || new Date().toISOString().slice(0, 7);

  if (!dryRun && !confirm('⚠ Emisión REAL: se solicitará el CAE a ARCA. ¿Continuar?')) return;

  const entradas = ids.map((id) => {
    const c = CLIENTES.find((x) => x.id === id);
    return {
      clienteId: id,
      periodo,
      enviarEmail,
      items: (c.items || []).map((i) => ({
        descripcion: i.descripcion,
        cantidad: i.cantidad,
        precioUnitario: i.precio_unitario,
      })),
    };
  });

  $('#resultado-emision').innerHTML = '<p class="hint">Procesando…</p>';
  try {
    const r = await api('/api/emitir', { method: 'POST', body: { entradas, dryRun } });
    renderResultado(r);
  } catch (e) {
    $('#resultado-emision').innerHTML = `<div class="card err">Error: ${esc(e.message)}</div>`;
  }
};
function renderResultado(r) {
  let html = `<div class="card"><strong>${r.dryRun ? '🧪 DRY-RUN' : '🧾 Emisión'} (${r.ambiente})</strong></div>`;
  for (const x of r.resultados) {
    if (x.ok) {
      const cae = x.cae ? `CAE ${x.cae} (vto ${x.caeVto})` : 'sin CAE (dry-run)';
      const pdf = x.comprobanteId ? ` · <a href="/api/comprobantes/${x.comprobanteId}/pdf" target="_blank">PDF</a>` : '';
      const mail = x.emailEstado === 'enviado' ? ' · 📧 enviado' : x.emailEstado === 'error' ? ` · 📧 error: ${esc(x.emailError || '')}` : '';
      html += `<div class="result-line ok">✔ Nº ${x.numero} · ${money(x.importeTotal)} · ${cae}${pdf}${mail}</div>`;
    } else {
      html += `<div class="result-line err">✖ ${esc(x.error || 'error')}</div>`;
    }
  }
  $('#resultado-emision').innerHTML = html;
  cargarClientes();
}

// ---- Historial -----------------------------------------------------------
async function cargarComprobantes() {
  const comps = await api('/api/comprobantes');
  const tb = $('#tabla-comprobantes tbody');
  tb.innerHTML = '';
  for (const c of comps) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${esc(c.fecha_comprobante)}</td>
      <td>${tipoNombre(c.tipo)}</td>
      <td>${String(c.punto_venta).padStart(5, '0')}-${String(c.numero).padStart(8, '0')}</td>
      <td>${esc(c.razon_social)}</td>
      <td>${money(c.importe_total)}</td>
      <td>${c.cae || (c.resultado === 'DRY' ? 'DRY' : '-')}</td>
      <td>${c.ambiente}</td>
      <td>${c.pdf_path ? `<a href="/api/comprobantes/${c.id}/pdf" target="_blank">PDF</a>` : '-'}</td>`;
    tb.appendChild(tr);
  }
}
function tipoNombre(t) {
  return t === 13 ? 'NC C' : t === 12 ? 'ND C' : 'Fact C';
}

// ---- util ----------------------------------------------------------------
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

init();
