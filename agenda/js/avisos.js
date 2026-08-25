/**
 * Agenda — avisos.
 * Mientras la agenda está abierta (pestaña o app instalada) revisa cada 20 segundos
 * qué recordatorio toca y muestra la notificación del sistema + un sonido corto.
 * Para que suene con la agenda cerrada está el botón "Al calendario" de cada
 * recordatorio: lo pasa al calendario del celular, que avisa siempre.
 */
window.Agenda = window.Agenda || {};

(function () {
  const almacen = () => Agenda.almacen;
  let timer = null;
  let alSonar = null;

  const soportado = () => typeof Notification !== "undefined";
  const permiso = () => (soportado() ? Notification.permission : "unsupported");

  async function pedirPermiso() {
    if (!soportado()) return "unsupported";
    if (Notification.permission !== "default") return Notification.permission;
    try {
      return await Notification.requestPermission();
    } catch {
      return Notification.permission;
    }
  }

  /** Beep suave generado en el momento (no hace falta ningún archivo de sonido). */
  function sonar() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const notas = [880, 1174.7];
      notas.forEach((hz, i) => {
        const osc = ctx.createOscillator();
        const vol = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = hz;
        const t0 = ctx.currentTime + i * 0.18;
        vol.gain.setValueAtTime(0.0001, t0);
        vol.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
        vol.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
        osc.connect(vol).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.2);
      });
      setTimeout(() => ctx.close && ctx.close(), 1200);
    } catch { /* sin sonido: el aviso visual igual aparece */ }
  }

  function notificar(r) {
    const cuando = r.hora ? `a las ${r.hora}` : "hoy";
    const cuerpo = [cuando, r.nota].filter(Boolean).join(" · ");
    if (permiso() === "granted") {
      try {
        const n = new Notification(`${r.tipo === "reunion" ? "📅" : "✅"} ${r.titulo}`, {
          body: cuerpo,
          tag: r.id,          // no se apilan avisos repetidos del mismo recordatorio
          renotify: false,
          icon: "icono.svg",
          badge: "icono.svg",
        });
        n.onclick = () => { window.focus(); n.close(); };
      } catch { /* algunos navegadores exigen service worker: queda el aviso en pantalla */ }
    }
    sonar();
    if (alSonar) alSonar(r);
  }

  /** Recorre los pendientes y avisa los que llegaron a su momento. */
  function revisar() {
    const a = almacen();
    const ahora = Date.now();
    for (const r of a.leer()) {
      if (r.hecho || r.avisado) continue;
      const momento = a.momentoAviso(r).getTime();
      // Se avisa cuando llegó la hora; si estuvo cerrada más de un día, no molesta con lo viejo.
      if (momento <= ahora && ahora - momento < 24 * 60 * 60 * 1000) {
        a.actualizar(r.id, { avisado: true });
        notificar(r);
      }
    }
  }

  /** Arranca el reloj de avisos. `cuando` se llama con cada recordatorio que suena. */
  function iniciar(cuando) {
    alSonar = cuando || null;
    if (timer) clearInterval(timer);
    revisar();
    timer = setInterval(revisar, 20000);
    // Al volver a la pestaña, revisa enseguida (el navegador frena los timers en segundo plano).
    document.addEventListener("visibilitychange", () => { if (!document.hidden) revisar(); });
  }

  Agenda.avisos = { soportado, permiso, pedirPermiso, iniciar, revisar, notificar, sonar };
})();
