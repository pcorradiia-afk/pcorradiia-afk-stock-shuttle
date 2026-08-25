/**
 * Agenda — pantalla principal.
 * Junta las piezas: fechas.js (entender lo que se escribe), almacen.js (guardar),
 * avisos.js (notificar) e ics.js (pasar al calendario del celular).
 */
(function () {
  const { fechas, almacen, avisos, ics } = Agenda;
  const $ = (sel) => document.querySelector(sel);

  const estado = { solapa: "hoy", editando: null };
  let deshacer = null;      // último borrado, para el botón "Deshacer"
  let instalador = null;    // evento de instalación de la app (Android/Chrome)

  const TIPOS = { reunion: { emoji: "📅", nombre: "Reunión" }, tarea: { emoji: "✅", nombre: "Tarea" } };
  const REPITE = { diario: "Todos los días", semanal: "Cada semana", mensual: "Cada mes" };
  const AVISOS = { 0: "A la hora", 10: "10 min antes", 30: "30 min antes", 60: "1 h antes", 1440: "1 día antes" };

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ============================ arranque ============================

  function iniciar() {
    aplicarTema(almacen.prefs().tema);
    $("#fecha-hoy").textContent = fechas.fechaLarga(fechas.hoyISO()).replace(/^./, (c) => c.toUpperCase());

    $("#form-rapido").addEventListener("submit", agregarRapido);
    $("#entrada").addEventListener("input", mostrarLectura);
    $("#atajos").addEventListener("click", clickAtajo);
    $("#solapas").addEventListener("click", clickSolapa);
    $("#lista").addEventListener("click", clickLista);
    $("#menu").addEventListener("click", clickMenu);
    $("#f-guardar").addEventListener("click", guardarFicha);
    $("#f-cancelar").addEventListener("click", cerrarFicha);
    $("#btn-tema").addEventListener("click", alternarTema);
    $("#btn-avisos").addEventListener("click", activarAvisos);
    $("#archivo").addEventListener("change", restaurarCopia);

    document.addEventListener("click", cerrarDesplegables);
    document.addEventListener("keydown", atajosTeclado);
    almacen.suscribir(dibujar);

    avisos.iniciar((r) => {
      dibujar();
      brindis(`🔔 ${r.titulo}`);
    });
    pintarBotonAvisos();
    dibujar();
    prepararInstalacion();
    registrarServiceWorker();
  }

  // ======================== carga de recordatorios ========================

  function agregarRapido(e) {
    e.preventDefault();
    const texto = $("#entrada").value.trim();
    if (!texto) return $("#entrada").focus();
    const leido = fechas.parseEntrada(texto);
    if (!leido.titulo) return brindis("Escribí qué querés recordar");
    const r = almacen.crear({ ...leido, aviso: leido.hora ? 10 : 0 });
    $("#entrada").value = "";
    mostrarLectura();
    mostrarSolapaDe(r);
    brindis(`Listo: ${resumenCuando(r)}`);
  }

  /** Deja a la vista la solapa donde quedó el recordatorio recién cargado. */
  function mostrarSolapaDe(r) {
    estado.solapa = r.fecha > fechas.hoyISO() ? "proximos" : "hoy";
    dibujar();
  }

  /** Muestra debajo del input cómo entendió la fecha (para que no haya sorpresas). */
  function mostrarLectura() {
    const texto = $("#entrada").value.trim();
    const caja = $("#lectura");
    if (!texto) return void (caja.hidden = true);
    const r = fechas.parseEntrada(texto);
    caja.hidden = false;
    caja.innerHTML = `Se agenda como <strong>${TIPOS[r.tipo].emoji} ${esc(r.titulo || "(sin título)")}</strong> · ${esc(resumenCuando(r))}`;
  }

  const resumenCuando = (r) =>
    `${fechas.etiquetaDia(r.fecha).toLowerCase()}${r.hora ? ` a las ${r.hora}` : ", todo el día"}`;

  function clickAtajo(e) {
    const boton = e.target.closest("[data-atajo]");
    if (!boton) return;
    const atajo = boton.dataset.atajo;
    if (atajo === "opciones") return abrirFicha(null);

    const texto = $("#entrada").value.trim();
    if (!texto) {
      $("#entrada").focus();
      return brindis("Escribí primero qué querés recordar");
    }
    const base = fechas.parseEntrada(texto);
    if (atajo === "hoy") Object.assign(base, { fecha: fechas.hoyISO() });
    if (atajo === "manana") Object.assign(base, { fecha: fechas.sumarDias(fechas.hoyISO(), 1), hora: "09:00" });
    if (atajo === "hora") {
      const d = new Date(Date.now() + 3600000);
      Object.assign(base, { fecha: fechas.aISO(d), hora: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` });
    }
    const r = almacen.crear({ ...base, aviso: base.hora ? 10 : 0 });
    $("#entrada").value = "";
    mostrarLectura();
    mostrarSolapaDe(r);
    brindis(`Listo: ${resumenCuando(r)}`);
  }

  // ============================== ficha ==============================

  function abrirFicha(r) {
    estado.editando = r ? r.id : null;
    const texto = $("#entrada").value.trim();
    const base = r || { ...fechas.parseEntrada(texto || " "), nota: "", aviso: 10, repite: "no" };
    if (!r && !texto) base.titulo = "";

    $("#ficha-titulo").textContent = r ? "Editar recordatorio" : "Nuevo recordatorio";
    $("#f-titulo").value = base.titulo || "";
    $("#f-tipo").value = base.tipo || "tarea";
    $("#f-fecha").value = base.fecha || fechas.hoyISO();
    $("#f-hora").value = base.hora || "";
    $("#f-aviso").value = String(base.aviso ?? 10);
    $("#f-repite").value = base.repite || "no";
    $("#f-nota").value = base.nota || "";
    $("#ficha").hidden = false;
    $("#f-titulo").focus();
  }

  function cerrarFicha() {
    $("#ficha").hidden = true;
    estado.editando = null;
  }

  function guardarFicha() {
    const datos = {
      titulo: $("#f-titulo").value.trim(),
      tipo: $("#f-tipo").value,
      fecha: $("#f-fecha").value || fechas.hoyISO(),
      hora: $("#f-hora").value || null,
      aviso: Number($("#f-aviso").value),
      repite: $("#f-repite").value,
      nota: $("#f-nota").value.trim(),
    };
    if (!datos.titulo) {
      $("#f-titulo").focus();
      return brindis("Falta el título");
    }
    if (estado.editando) {
      almacen.actualizar(estado.editando, datos);
      brindis("Guardado");
    } else {
      almacen.crear(datos);
      $("#entrada").value = "";
      mostrarLectura();
      mostrarSolapaDe(datos);
      brindis(`Listo: ${resumenCuando(datos)}`);
    }
    cerrarFicha();
  }

  // ============================== lista ==============================

  function clickSolapa(e) {
    const boton = e.target.closest("[data-solapa]");
    if (!boton) return;
    estado.solapa = boton.dataset.solapa;
    dibujar();
  }

  function clickLista(e) {
    const accionable = e.target.closest("[data-accion]");
    const tarjeta = e.target.closest(".tarjeta");
    if (!accionable || !tarjeta) return;
    const id = tarjeta.dataset.id;
    const r = almacen.leer().find((x) => x.id === id);
    if (!r) return;

    switch (accionable.dataset.accion) {
      case "hecho":
        almacen.marcarHecho(id, !r.hecho);
        brindis(r.hecho ? "Volvió a pendientes" : (r.repite !== "no" ? "Hecho · se agendó el próximo" : "¡Hecho! 🎉"));
        break;
      case "editar":
        abrirFicha(r);
        window.scrollTo({ top: 0, behavior: "smooth" });
        break;
      case "posponer": {
        almacen.posponer(id, accionable.dataset.valor);
        const nuevo = almacen.leer().find((x) => x.id === id);
        brindis(`Pospuesto: ${resumenCuando(nuevo)}`);
        break;
      }
      case "ics":
        ics.descargar(`${ics.nombreArchivo(r.titulo)}.ics`, ics.calendario([r]));
        brindis("Abrí el archivo para sumarlo a tu calendario");
        break;
      case "borrar":
        deshacer = almacen.borrar(id);
        brindis("Eliminado", { etiqueta: "Deshacer", accion: () => { almacen.restaurar(deshacer); deshacer = null; } });
        break;
    }
    cerrarDesplegables();
  }

  function dibujar() {
    const v = almacen.vistas();

    $("#c-hoy").textContent = v.hoy.length || "";
    $("#c-proximos").textContent = v.proximos.length || "";
    document.querySelectorAll("[data-solapa]").forEach((b) =>
      b.classList.toggle("activa", b.dataset.solapa === estado.solapa));

    const lista = {
      hoy: v.hoy,
      proximos: v.proximos,
      todo: v.pendientes,
      hechos: v.hechos,
    }[estado.solapa] || v.hoy;

    const contenedor = $("#lista");
    if (!lista.length) {
      contenedor.innerHTML = vacio();
      return;
    }
    contenedor.innerHTML = estado.solapa === "hechos"
      ? lista.map(tarjeta).join("")
      : porDia(lista);

    document.title = v.hoy.length ? `(${v.hoy.length}) Mi agenda` : "Mi agenda · recordatorios";
  }

  /** Agrupa por día con títulos amigables: Hoy, Mañana, Lunes 14 de septiembre… */
  function porDia(lista) {
    const hoy = fechas.hoyISO();
    const grupos = new Map();
    for (const r of lista) {
      if (!grupos.has(r.fecha)) grupos.set(r.fecha, []);
      grupos.get(r.fecha).push(r);
    }
    return [...grupos.entries()].map(([fecha, items]) => {
      const atrasado = fecha < hoy;
      const titulo = atrasado ? `⚠️ Atrasado · ${fechas.etiquetaDia(fecha)}` : fechas.etiquetaDia(fecha);
      return `<h2 class="grupo-titulo${atrasado ? " atrasado" : ""}">${esc(titulo)}</h2>${items.map(tarjeta).join("")}`;
    }).join("");
  }

  function tarjeta(r) {
    const tipo = TIPOS[r.tipo] || TIPOS.tarea;
    const cuando = almacen.momento(r);
    const vencido = !r.hecho && cuando < new Date() && (r.hora || r.fecha < fechas.hoyISO());
    const pastillas = [
      `<span class="pastilla tipo">${tipo.emoji} ${tipo.nombre}</span>`,
      `<span class="pastilla">${r.hora ? `🕒 ${esc(r.hora)}` : "Todo el día"}</span>`,
    ];
    if (r.hecho) {
      pastillas.push(`<span class="pastilla pronto">Hecho</span>`);
    } else {
      const falta = r.hora ? fechas.relativo(cuando) : fechas.relativoDia(r.fecha);
      pastillas.push(`<span class="pastilla ${vencido ? "tarde" : "pronto"}">${esc(falta)}</span>`);
      if (r.repite !== "no") pastillas.push(`<span class="pastilla">🔁 ${REPITE[r.repite]}</span>`);
      if (r.hora || Number(r.aviso)) pastillas.push(`<span class="pastilla">🔔 ${AVISOS[r.aviso] || `${r.aviso} min antes`}</span>`);
    }

    // A lo ya hecho no tiene sentido ofrecerle "posponer".
    const opciones = [
      ...(r.hecho ? [] : [
        `<button type="button" data-accion="posponer" data-valor="30">⏰ Posponer 30 minutos</button>`,
        `<button type="button" data-accion="posponer" data-valor="60">⏰ Posponer 1 hora</button>`,
        `<button type="button" data-accion="posponer" data-valor="manana">📆 Pasar a mañana</button>`,
        `<button type="button" data-accion="ics">📅 Pasar al calendario</button>`,
      ]),
      `<button type="button" data-accion="editar">✏️ Editar</button>`,
      `<button type="button" data-accion="borrar" class="peligro">🗑️ Eliminar</button>`,
    ].join("");

    return `
      <article class="tarjeta${r.hecho ? " lista" : ""}${vencido ? " vencida" : ""}" data-id="${esc(r.id)}">
        <button type="button" class="tilde" data-accion="hecho"
          title="${r.hecho ? "Volver a pendientes" : "Marcar como hecho"}"
          aria-label="${r.hecho ? "Volver a pendientes" : "Marcar como hecho"}">✓</button>
        <div class="cuerpo" data-accion="editar" title="Tocá para editar">
          <div class="titulo">${esc(r.titulo)}</div>
          ${r.nota ? `<div class="nota">${esc(r.nota)}</div>` : ""}
          <div class="meta">${pastillas.join("")}</div>
        </div>
        <details class="acciones">
          <summary title="Opciones" aria-label="Opciones">⋯</summary>
          <div class="menu-lista">${opciones}</div>
        </details>
      </article>`;
  }

  function vacio() {
    const textos = {
      hoy: ["🎉", "No tenés nada para hoy", "Escribí arriba lo que no querés olvidarte."],
      proximos: ["🌤️", "Nada agendado más adelante", "Probá con “mañana 15:30 reunión con Juan”."],
      todo: ["📝", "Todavía no hay recordatorios", "Empezá por el primero, se carga en dos segundos."],
      hechos: ["✅", "Acá van a aparecer los hechos", "Marcá el círculo de un recordatorio cuando lo termines."],
    }[estado.solapa];
    return `<div class="vacio"><span class="emoji">${textos[0]}</span><strong>${textos[1]}</strong><p>${textos[2]}</p></div>`;
  }

  // ======================== menú y preferencias ========================

  function clickMenu(e) {
    const boton = e.target.closest("[data-menu]");
    if (!boton) return;
    const pendientes = almacen.vistas().pendientes;

    switch (boton.dataset.menu) {
      case "calendario":
        if (!pendientes.length) { brindis("No hay recordatorios pendientes"); break; }
        ics.descargar("mi-agenda.ics", ics.calendario(pendientes));
        brindis("Abrí el archivo para sumarlos a tu calendario");
        break;
      case "exportar":
        ics.descargar(`agenda-${fechas.hoyISO()}.json`, almacen.exportar(), "application/json");
        brindis("Copia guardada");
        break;
      case "importar":
        $("#archivo").click();
        break;
      case "instalar":
        if (instalador) { instalador.prompt(); instalador = null; }
        break;
      case "limpiar": {
        const hechos = almacen.vistas().hechos;
        if (!hechos.length) { brindis("No hay nada para limpiar"); break; }
        if (confirm(`¿Borrar ${hechos.length} recordatorio(s) ya hechos?`)) {
          hechos.forEach((r) => almacen.borrar(r.id));
          brindis("Listo, quedó ordenado");
        }
        break;
      }
      case "ayuda":
        $("#ayuda").showModal();
        break;
    }
    cerrarDesplegables();
  }

  function restaurarCopia(e) {
    const archivo = e.target.files && e.target.files[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => {
      try {
        const { total, nuevos } = almacen.importar(String(lector.result));
        brindis(`Se leyeron ${total} · ${nuevos} nuevos`);
      } catch (err) {
        brindis(`No se pudo leer el archivo: ${err.message}`);
      }
    };
    lector.readAsText(archivo);
    e.target.value = "";
  }

  function aplicarTema(tema) {
    if (tema) document.documentElement.dataset.tema = tema;
    else delete document.documentElement.dataset.tema;
    const oscuro = tema === "oscuro"
      || (!tema && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    $("#btn-tema").textContent = oscuro ? "☀️" : "🌙";
  }

  function alternarTema() {
    const actual = document.documentElement.dataset.tema;
    const oscuroAhora = actual === "oscuro"
      || (!actual && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const nuevo = oscuroAhora ? "claro" : "oscuro";
    almacen.prefs({ tema: nuevo });
    aplicarTema(nuevo);
  }

  async function activarAvisos() {
    if (!avisos.soportado()) return brindis("Este navegador no muestra avisos del sistema");
    const estadoPermiso = await avisos.pedirPermiso();
    if (estadoPermiso === "granted") {
      avisos.notificar({ id: "prueba", titulo: "Avisos activados", tipo: "tarea", hora: null, nota: "Te voy a avisar cuando toque." });
      brindis("Avisos activados 🔔");
    } else if (estadoPermiso === "denied") {
      brindis("Los avisos están bloqueados en el navegador. Se pueden permitir desde el candadito de la barra de direcciones.");
    }
    pintarBotonAvisos();
  }

  function pintarBotonAvisos() {
    const boton = $("#btn-avisos");
    const p = avisos.permiso();
    boton.classList.toggle("encendido", p === "granted");
    boton.title = p === "granted" ? "Los avisos están activados"
      : p === "denied" ? "Los avisos están bloqueados en el navegador"
      : "Activar los avisos";
  }

  // ============================ varios ============================

  let timerBrindis = null;
  function brindis(texto, accion) {
    const caja = $("#brindis");
    caja.innerHTML = `<span>${esc(texto)}</span>`;
    if (accion) {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.textContent = accion.etiqueta;
      boton.addEventListener("click", () => { accion.accion(); caja.hidden = true; });
      caja.appendChild(boton);
    }
    caja.hidden = false;
    clearTimeout(timerBrindis);
    timerBrindis = setTimeout(() => { caja.hidden = true; }, accion ? 7000 : 3500);
  }

  /** Cierra los menús ⋯ abiertos (los de las tarjetas y el de la cabecera). */
  function cerrarDesplegables(e) {
    document.querySelectorAll("details[open]").forEach((d) => {
      if (!e || !d.contains(e.target)) d.removeAttribute("open");
    });
  }

  function atajosTeclado(e) {
    if (e.key === "Escape") {
      cerrarFicha();
      cerrarDesplegables();
      return;
    }
    const escribiendo = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (e.key === "/" && !escribiendo) {
      e.preventDefault();
      $("#entrada").focus();
    }
  }

  function prepararInstalacion() {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      instalador = e;
      const boton = document.querySelector('[data-menu="instalar"]');
      if (boton) boton.hidden = false;
    });
  }

  function registrarServiceWorker() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    navigator.serviceWorker.register("sw.js").catch(() => { /* sin modo sin conexión: la agenda igual anda */ });
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
