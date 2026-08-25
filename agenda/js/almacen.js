/**
 * Agenda — dónde se guardan los recordatorios.
 * Todo vive en el navegador (localStorage): no hay servidor, ni cuenta, ni login.
 * Para no perderlos: menú ⋯ → "Guardar copia" (exporta un .json que se puede volver a cargar).
 */
window.Agenda = window.Agenda || {};

(function () {
  const { hoyISO, sumarDias, combinar, aISO, proximaOcurrencia, ponerAlDia } = Agenda.fechas;

  const CLAVE = "agenda.recordatorios.v1";
  const CLAVE_PREFS = "agenda.preferencias.v1";
  const oyentes = new Set();

  /** localStorage puede fallar (modo privado, permisos): la app sigue andando en memoria. */
  let memoria = null;

  function leer() {
    if (memoria) return memoria;
    try {
      memoria = JSON.parse(localStorage.getItem(CLAVE) || "[]");
      if (!Array.isArray(memoria)) memoria = [];
    } catch {
      memoria = [];
    }
    return memoria;
  }

  function escribir(lista) {
    memoria = lista;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(lista));
    } catch (e) {
      console.warn("No se pudo guardar en este navegador:", e);
    }
    oyentes.forEach((fn) => fn(lista));
  }

  const uid = () => `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  /** Se avisa a la UI cada vez que cambia algo. Devuelve la función para desuscribirse. */
  function suscribir(fn) {
    oyentes.add(fn);
    return () => oyentes.delete(fn);
  }

  const VACIO = {
    titulo: "", tipo: "tarea", fecha: null, hora: null, nota: "",
    aviso: 10, repite: "no",
  };

  function crear(datos) {
    const r = {
      ...VACIO, ...datos,
      id: uid(),
      fecha: datos.fecha || hoyISO(),
      hecho: false,
      hechoEn: null,
      avisado: false,
      creadoEn: new Date().toISOString(),
    };
    escribir([...leer(), r]);
    return r;
  }

  function actualizar(id, cambios) {
    const lista = leer().map((r) => {
      if (r.id !== id) return r;
      const actualizado = { ...r, ...cambios };
      // Si se movió el momento del recordatorio, vuelve a quedar pendiente de avisar
      // (salvo que quien llama esté justamente marcando el aviso ya dado).
      const semovio = cambios.fecha !== undefined || cambios.hora !== undefined || cambios.aviso !== undefined;
      if (semovio && cambios.avisado === undefined) actualizado.avisado = false;
      return actualizado;
    });
    escribir(lista);
    return lista.find((r) => r.id === id);
  }

  function borrar(id) {
    const r = leer().find((x) => x.id === id);
    escribir(leer().filter((x) => x.id !== id));
    return r; // se devuelve para poder deshacer
  }

  /** Vuelve a poner un recordatorio borrado (deshacer). */
  function restaurar(r) {
    if (!r) return;
    escribir([...leer().filter((x) => x.id !== r.id), r]);
  }

  /**
   * Marcar como hecho. Si se repite, no se archiva: pasa a la próxima fecha
   * (así "reunión de equipo todos los lunes" se agenda sola).
   */
  function marcarHecho(id, hecho = true) {
    const r = leer().find((x) => x.id === id);
    if (!r) return;
    if (hecho && r.repite !== "no") {
      const siguiente = proximaOcurrencia(r.fecha, r.repite);
      return actualizar(id, { fecha: ponerAlDia(siguiente, r.repite), hecho: false, hechoEn: null, avisado: false });
    }
    return actualizar(id, { hecho, hechoEn: hecho ? new Date().toISOString() : null, avisado: hecho ? true : false });
  }

  /** Posponer: "30" / "60" minutos, "manana" o "semana". */
  function posponer(id, cuanto) {
    const r = leer().find((x) => x.id === id);
    if (!r) return;
    if (cuanto === "manana" || cuanto === "semana") {
      const dias = cuanto === "manana" ? 1 : 7;
      return actualizar(id, { fecha: sumarDias(r.fecha < hoyISO() ? hoyISO() : r.fecha, dias) });
    }
    const minutos = Number(cuanto) || 30;
    // Se cuenta desde el momento del recordatorio (los de todo el día, desde las 9),
    // pero nunca hacia atrás: si ya pasó, se pospone desde ahora.
    const base = combinar(r.fecha, r.hora || "09:00");
    const destino = new Date(Math.max(base.getTime(), Date.now()) + minutos * 60000);
    return actualizar(id, {
      fecha: aISO(destino),
      hora: `${String(destino.getHours()).padStart(2, "0")}:${String(destino.getMinutes()).padStart(2, "0")}`,
    });
  }

  /** Momento exacto en que hay que avisar (fecha/hora menos los minutos de aviso). */
  function momentoAviso(r) {
    const cuando = combinar(r.fecha, r.hora || "09:00");
    return new Date(cuando.getTime() - (Number(r.aviso) || 0) * 60000);
  }

  /** Momento del recordatorio en sí (para ordenar y mostrar "en 2 h"). */
  const momento = (r) => combinar(r.fecha, r.hora);

  const ordenar = (lista) => [...lista].sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
    if (!a.hora && b.hora) return -1;      // los de "todo el día" van primero
    if (a.hora && !b.hora) return 1;
    if (a.hora !== b.hora) return (a.hora || "") < (b.hora || "") ? -1 : 1;
    return (a.creadoEn || "") < (b.creadoEn || "") ? -1 : 1;
  });

  /** Listas ya filtradas para cada solapa de la app. */
  function vistas() {
    const todos = ordenar(leer());
    const hoy = hoyISO();
    const pendientes = todos.filter((r) => !r.hecho);
    return {
      todos,
      pendientes,
      vencidos: pendientes.filter((r) => r.fecha < hoy || (r.fecha === hoy && r.hora && momento(r) < new Date())),
      hoy: pendientes.filter((r) => r.fecha <= hoy),
      proximos: pendientes.filter((r) => r.fecha > hoy),
      hechos: todos.filter((r) => r.hecho).reverse(),
    };
  }

  // ---------------- copia de seguridad ----------------

  const exportar = () => JSON.stringify({ app: "agenda", version: 1, recordatorios: leer() }, null, 2);

  /** Importa un .json exportado antes. Suma los que faltan y pisa los repetidos por id. */
  function importar(texto) {
    const datos = JSON.parse(texto);
    const entrantes = Array.isArray(datos) ? datos : datos.recordatorios;
    if (!Array.isArray(entrantes)) throw new Error("El archivo no tiene recordatorios");
    const porId = new Map(leer().map((r) => [r.id, r]));
    let nuevos = 0;
    for (const r of entrantes) {
      if (!r || !r.titulo) continue;
      if (!porId.has(r.id)) nuevos++;
      porId.set(r.id || uid(), { ...VACIO, hecho: false, ...r });
    }
    escribir([...porId.values()]);
    return { total: entrantes.length, nuevos };
  }

  function borrarTodo() {
    escribir([]);
  }

  // ---------------- preferencias (tema) ----------------

  function prefs(cambios) {
    let actual = {};
    try {
      actual = JSON.parse(localStorage.getItem(CLAVE_PREFS) || "{}");
    } catch { /* preferencias por defecto */ }
    if (!cambios) return actual;
    const nuevas = { ...actual, ...cambios };
    try {
      localStorage.setItem(CLAVE_PREFS, JSON.stringify(nuevas));
    } catch { /* no se pudo guardar la preferencia: no es grave */ }
    return nuevas;
  }

  Agenda.almacen = {
    leer, suscribir, crear, actualizar, borrar, restaurar, marcarHecho, posponer,
    momento, momentoAviso, ordenar, vistas, exportar, importar, borrarTodo, prefs,
  };
})();
