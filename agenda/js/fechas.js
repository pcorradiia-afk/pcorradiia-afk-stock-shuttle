/**
 * Agenda — utilidades de fecha y "lenguaje natural" en español.
 * Todo se maneja en hora LOCAL: las fechas son strings "aaaa-mm-dd" y las horas "hh:mm".
 */
window.Agenda = window.Agenda || {};

(function () {
  const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  /** Date -> "aaaa-mm-dd" (local, sin corrimiento por UTC). */
  function aISO(d) {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  /** "aaaa-mm-dd" -> Date local a las 00:00 (new Date("2026-01-05") daría UTC). */
  function desdeISO(iso) {
    const [a, m, d] = String(iso).split("-").map(Number);
    return new Date(a, (m || 1) - 1, d || 1);
  }

  const hoyISO = () => aISO(new Date());

  function sumarDias(iso, n) {
    const d = desdeISO(iso);
    d.setDate(d.getDate() + n);
    return aISO(d);
  }

  /** Fecha + hora -> Date. Si no hay hora, arranca a las 00:00. */
  function combinar(iso, hora) {
    const d = desdeISO(iso);
    if (hora) {
      const [h, m] = hora.split(":").map(Number);
      d.setHours(h || 0, m || 0, 0, 0);
    }
    return d;
  }

  /** "martes 25 de agosto" (agrega el año si no es el actual). */
  function fechaLarga(iso) {
    const d = desdeISO(iso);
    const base = `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
    return d.getFullYear() === new Date().getFullYear() ? base : `${base} de ${d.getFullYear()}`;
  }

  /** Título amigable del grupo de un día: "Hoy", "Mañana", "Ayer" o la fecha larga. */
  function etiquetaDia(iso) {
    const hoy = hoyISO();
    if (iso === hoy) return "Hoy";
    if (iso === sumarDias(hoy, 1)) return "Mañana";
    if (iso === sumarDias(hoy, -1)) return "Ayer";
    return fechaLarga(iso).replace(/^./, (c) => c.toUpperCase());
  }

  /** "en 20 min", "en 3 h", "hace 2 días"… siempre en castellano y redondeado. */
  function relativo(fecha) {
    const min = Math.round((fecha.getTime() - Date.now()) / 60000);
    const abs = Math.abs(min);
    let texto;
    if (abs < 1) texto = "ahora";
    else if (abs < 60) texto = `${abs} min`;
    else if (abs < 60 * 24) {
      const h = Math.floor(abs / 60), m = abs % 60;
      texto = m && h < 6 ? `${h} h ${m} min` : `${h} h`;
    } else {
      const d = Math.round(abs / (60 * 24));
      texto = d === 1 ? "1 día" : `${d} días`;
    }
    if (texto === "ahora") return "ahora";
    return min >= 0 ? `en ${texto}` : `hace ${texto}`;
  }

  /** Como `relativo`, pero contando días enteros (para los de "todo el día"). */
  function relativoDia(iso) {
    const dias = Math.round((desdeISO(iso) - desdeISO(hoyISO())) / 86400000);
    if (dias === 0) return "hoy";
    if (dias === 1) return "mañana";
    if (dias === -1) return "ayer";
    return dias > 0 ? `en ${dias} días` : `hace ${-dias} días`;
  }

  /** Próxima fecha de un recordatorio que se repite. */
  function proximaOcurrencia(iso, repite) {
    const d = desdeISO(iso);
    if (repite === "diario") d.setDate(d.getDate() + 1);
    else if (repite === "semanal") d.setDate(d.getDate() + 7);
    else if (repite === "mensual") {
      const dia = d.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth() + 1);
      // Si el mes que viene no tiene ese día (31), cae en el último día del mes.
      const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(dia, ultimo));
    } else return null;
    return aISO(d);
  }

  /** Si la fecha ya pasó, la adelanta hasta la próxima ocurrencia futura. */
  function ponerAlDia(iso, repite) {
    let f = iso;
    const hoy = hoyISO();
    let vueltas = 0;
    while (f < hoy && vueltas < 500) {
      const sig = proximaOcurrencia(f, repite);
      if (!sig) break;
      f = sig;
      vueltas++;
    }
    return f;
  }

  // ------------------------------------------------------------------
  // Lectura de lo que se escribe en la barra rápida.
  // Ejemplos: "mañana 15:30 reunión con Juan", "lunes 9 am llamar al contador",
  //           "en 2 horas sacar el turno", "5/9 pagar el seguro".
  // ------------------------------------------------------------------
  const PALABRAS_REUNION = /\b(reuni[oó]n|reunirme|reunion|junta|meeting|meet|zoom|videollamada|llamad[ao]|entrevista|cita|almuerzo|caf[eé]|visita)\b/i;

  function parseEntrada(texto) {
    let t = ` ${texto} `;
    let fecha = null, hora = null;

    const sacar = (re) => {
      const m = t.match(re);
      if (m) t = t.replace(m[0], " ");
      return m;
    };

    // "en 30 min" / "en 2 horas" -> fecha y hora exactas desde ahora
    const enRato = sacar(/\ben\s+(\d{1,3})\s*(min(?:utos?)?|h(?:s|oras?)?)\b/i);
    if (enRato) {
      const n = Number(enRato[1]);
      const d = new Date(Date.now() + n * (/^m/i.test(enRato[2]) ? 60000 : 3600000));
      fecha = aISO(d);
      hora = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }

    if (!fecha && sacar(/\bpasado\s+ma[ñn]ana\b/i)) fecha = sumarDias(hoyISO(), 2);
    if (!fecha && sacar(/\bma[ñn]ana\b/i)) fecha = sumarDias(hoyISO(), 1);
    if (!fecha && sacar(/\bhoy\b/i)) fecha = hoyISO();

    // Día de la semana: el próximo que venga (si es hoy, la semana que viene).
    if (!fecha) {
      const m = sacar(/\b(?:el\s+|este\s+|pr[oó]ximo\s+)?(domingo|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado)\b/i);
      if (m) {
        const idx = DIAS.findIndex((d) => quitarTildes(d) === quitarTildes(m[1].toLowerCase()));
        let delta = (idx - new Date().getDay() + 7) % 7;
        if (delta === 0) delta = 7; // "el lunes" dicho un lunes = el que viene
        fecha = sumarDias(hoyISO(), delta);
      }
    }

    // "5 de septiembre" / "5 de sep"
    if (!fecha) {
      const m = sacar(/(?:\bel\s+)?\b(\d{1,2})\s+de\s+([a-záéíóú]{3,10})\b/i);
      if (m) {
        const mes = MESES.findIndex((x) => quitarTildes(x).startsWith(quitarTildes(m[2].toLowerCase()).slice(0, 3)));
        if (mes >= 0) fecha = fechaFutura(Number(m[1]), mes);
      }
    }

    // "5/9" o "5-9-2026"
    if (!fecha) {
      const m = sacar(/(?:\bel\s+)?\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
      if (m) {
        const dia = Number(m[1]), mes = Number(m[2]) - 1;
        if (m[3]) {
          const a = Number(m[3].length === 2 ? `20${m[3]}` : m[3]);
          fecha = aISO(new Date(a, mes, dia));
        } else fecha = fechaFutura(dia, mes);
      }
    }

    // Horas: "15:30", "15hs", "a las 9", "9 am", "9:30pm"
    if (!hora) {
      const m = sacar(/\b(?:a\s+las?\s+)?([01]?\d|2[0-3])[:.](\d{2})\s*(a\.?m\.?|p\.?m\.?)?/i)
        || sacar(/\b(?:a\s+las?\s+)?([01]?\d|2[0-3])\s*(?:hs?|h)\b/i)
        || sacar(/\b(?:a\s+las?\s+)?(\d{1,2})\s*(a\.?m\.?|p\.?m\.?)/i)
        || sacar(/\ba\s+las?\s+(\d{1,2})\b/i);
      if (m) {
        let h = Number(m[1]);
        const min = /^\d{2}$/.test(m[2] || "") ? Number(m[2]) : 0;
        const sufijo = (m[3] || m[2] || "").toString().toLowerCase().replace(/\./g, "");
        if (sufijo.startsWith("p") && h < 12) h += 12;
        if (sufijo.startsWith("a") && h === 12) h = 0;
        if (h <= 23) hora = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
      }
    }

    const titulo = t.replace(/\s+/g, " ").trim().replace(/^[,;:\-–]\s*/, "");
    return {
      titulo: titulo.replace(/^./, (c) => c.toUpperCase()),
      fecha: fecha || hoyISO(),
      hora,
      tipo: PALABRAS_REUNION.test(texto) ? "reunion" : "tarea",
    };
  }

  /** Día/mes sin año: usa el año actual, o el que viene si ya pasó. */
  function fechaFutura(dia, mes) {
    const hoy = new Date();
    let candidata = new Date(hoy.getFullYear(), mes, dia);
    if (aISO(candidata) < aISO(hoy)) candidata = new Date(hoy.getFullYear() + 1, mes, dia);
    return aISO(candidata);
  }

  const quitarTildes = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  Agenda.fechas = {
    DIAS, MESES, aISO, desdeISO, hoyISO, sumarDias, combinar, fechaLarga,
    etiquetaDia, relativo, relativoDia, proximaOcurrencia, ponerAlDia, parseEntrada,
  };
})();
