/**
 * Agenda — pasar un recordatorio al calendario del celular o de la compu (.ics).
 * Sirve para que el aviso suene aunque la agenda esté cerrada: el calendario
 * del teléfono se encarga de la alarma.
 */
window.Agenda = window.Agenda || {};

(function () {
  const { combinar } = Agenda.fechas;

  const dosD = (n) => String(n).padStart(2, "0");
  const fechaLocal = (d) => `${d.getFullYear()}${dosD(d.getMonth() + 1)}${dosD(d.getDate())}T${dosD(d.getHours())}${dosD(d.getMinutes())}00`;
  const soloDia = (iso) => iso.replace(/-/g, "");
  const ahoraUTC = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  /** Los textos del .ics no pueden llevar comas ni saltos sin escapar. */
  const esc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

  const RRULE = { diario: "FREQ=DAILY", semanal: "FREQ=WEEKLY", mensual: "FREQ=MONTHLY" };

  function evento(r) {
    const lineas = [
      "BEGIN:VEVENT",
      `UID:${r.id}@agenda.local`,
      `DTSTAMP:${ahoraUTC()}`,
      `SUMMARY:${esc(r.titulo)}`,
    ];
    if (r.hora) {
      const inicio = combinar(r.fecha, r.hora);
      const fin = new Date(inicio.getTime() + (r.tipo === "reunion" ? 60 : 30) * 60000);
      lineas.push(`DTSTART:${fechaLocal(inicio)}`, `DTEND:${fechaLocal(fin)}`);
    } else {
      lineas.push(`DTSTART;VALUE=DATE:${soloDia(r.fecha)}`);
    }
    if (r.nota) lineas.push(`DESCRIPTION:${esc(r.nota)}`);
    if (RRULE[r.repite]) lineas.push(`RRULE:${RRULE[r.repite]}`);
    lineas.push(
      "BEGIN:VALARM",
      `TRIGGER:-PT${Number(r.aviso) || 0}M`,
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(r.titulo)}`,
      "END:VALARM",
      "END:VEVENT",
    );
    return lineas;
  }

  function calendario(recordatorios) {
    const cuerpo = recordatorios.flatMap(evento);
    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Agenda//ES",
      "CALSCALE:GREGORIAN",
      ...cuerpo,
      "END:VCALENDAR",
    ].join("\r\n");
  }

  /**
   * Algunos visores (por ejemplo el de Claude, cuando la agenda se abre ahí dentro)
   * no dejan que la página baje archivos sola: hay que pedírselo a ellos.
   * Devuelve "guardado", el código del problema, o null si no hay visor.
   */
  async function guardarConElVisor(nombre, contenido) {
    if (!window.claude || typeof window.claude.use !== "function") return null;
    const paciencia = new Promise((listo) => setTimeout(() => listo(null), 3000));
    const permiso = await Promise.race([Promise.resolve(window.claude.use("downloads")).catch(() => null), paciencia]);
    if (!permiso) return null;
    try {
      await permiso.save({ filename: nombre, data: contenido });
      return "guardado";
    } catch (e) {
      return (e && e.code) || "sin-permiso";
    }
  }

  async function descargar(nombre, contenido, tipo = "text/calendar;charset=utf-8") {
    const porVisor = await guardarConElVisor(nombre, contenido);
    if (porVisor) return porVisor;

    const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return "guardado";
  }

  const nombreArchivo = (t) => (t || "recordatorio").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "recordatorio";

  Agenda.ics = { calendario, descargar, nombreArchivo };
})();
