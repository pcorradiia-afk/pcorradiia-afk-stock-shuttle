"""Encuestas de calidad automatizadas (caso de uso #3).

Cierra el ciclo completo:
  1) ENVIAR: a las 48 hs de un retiro de ventas o de un service, manda la
     PRIMERA pregunta con una plantilla aprobada (inicia la conversación).
  2) CONVERSAR: una vez que el cliente contesta, seguimos pregunta por pregunta
     DENTRO de la ventana de 24 hs (texto libre, sin plantilla). Cada respuesta
     es un puntaje del 1 al 5.
  3) GUARDAR: cada puntaje (y el comentario final opcional) queda en el tablero
     de la empresa que prestó el servicio, con desglose por pregunta.

╔══════════════════════════════════════════════════════════════════════════╗
║  PREGUNTAS REALES DE CALIDAD                                                ║
║  Editá el diccionario PREGUNTAS (y el texto de _INTRO, que es la 1ª         ║
║  pregunta) cuando calidad ajuste el cuestionario. El texto de _INTRO        ║
║  también debe coincidir con la plantilla aprobada en WhatsApp/Twilio.       ║
╚══════════════════════════════════════════════════════════════════════════╝

Fase 1: todo en memoria (pendientes, progreso, resultados). Producción:
Supabase, sin cambiar esta interfaz.
"""

from __future__ import annotations

import copy
import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta
from pathlib import Path

from ..config import obtener_config
from ..core.normalizacion import normalizar_telefono
from ..marcas import LINEA_POSVENTA, buscar_por_empresa
from ..persistencia import obtener_repo
from . import sesion
from .twilio_client import enviar_plantilla

_DIR_DATOS = Path(__file__).resolve().parents[2] / "data"

# Horas a esperar después del evento antes de mandar la encuesta.
HORAS_ESPERA = 48

# Plantilla aprobada que se usa para INICIAR la encuesta (vive en Posventa).
PLANTILLA_ENCUESTA = "encuesta_calidad"

# Clave que usamos para guardar el comentario final (no es un puntaje 1-5).
PREGUNTA_COMENTARIO = "comentario"

# Tipos de encuesta y su etiqueta legible (para el panel).
TIPOS = ("taller", "ventas")
ETIQUETA_TIPO = {"taller": "Posventa / Taller", "ventas": "Ventas 0km"}
_TIPO_DEFECTO = "taller"

# ── CUESTIONARIO DE FÁBRICA ───────────────────────────────────────────────────
# Estas son las preguntas por defecto. Se pueden EDITAR desde el panel (se
# guardan por empresa en el repositorio); si una empresa no editó nada, se usan
# estas. El `encabezado` + la 1ª pregunta forman el cuerpo de la plantilla
# aprobada de WhatsApp (variables {nombre}, {empresa}, {referencia}).
CUESTIONARIO_DEFECTO: dict[str, dict] = {
    "taller": {
        "encabezado": (
            "¡Hola {nombre}! 👋 Soy Valentino, de {empresa}. Tu opinión nos ayuda "
            "a mejorar 💪🚗\n\nSobre tu paso por el taller con tu {referencia}:"
        ),
        "preguntas": [
            {"clave": "atencion", "texto": "¿Cómo te sentiste con la *atención en el taller*?"},
            {"clave": "calidad_trabajo", "texto": "¿Cómo evaluás la *calidad del trabajo* realizado?"},
            {"clave": "claridad", "texto": "¿La *explicación de los trabajos* fue clara?"},
            {"clave": "recomendacion", "texto": "¿*Recomendarías* la marca y nuestro taller?"},
        ],
    },
    "ventas": {
        "encabezado": (
            "¡Hola {nombre}! 👋 Soy Valentino, de {empresa}. Tu opinión nos ayuda "
            "a mejorar 💪🚗\n\nSobre la compra de tu {referencia}:"
        ),
        "preguntas": [
            {"clave": "atencion", "texto": "¿Cómo fue la *atención* que recibiste?"},
            {"clave": "asesoramiento", "texto": "¿Qué tan conforme quedaste con el *asesoramiento* en la compra?"},
            {"clave": "entrega", "texto": "¿Cómo fue la *entrega* de tu vehículo?"},
            {"clave": "recomendacion", "texto": "¿*Recomendarías* Pedro Corradi a un amigo o familiar?"},
        ],
    },
}

# Palabras con las que el cliente abandona la encuesta o pide una persona.
_ESCAPE = ("asesor", "humano", "cancelar", "salir", "basta")
# Palabras con las que el cliente cierra sin dejar comentario.
_SIN_COMENTARIO = ("listo", "no", "nada", "gracias", "ninguno", "ok")


class EncuestaError(Exception):
    """Error de configuración de encuestas (empresa/plantilla/archivo inexistente)."""


@dataclass
class ResultadoEncuesta:
    """Una respuesta guardada en el tablero (un puntaje por pregunta, o un comentario)."""

    id_empresa: str
    telefono: str
    tipo: str          # "ventas" | "taller"
    referencia: str    # modelo comprado o service realizado
    pregunta: str      # clave de la pregunta, o "comentario"
    valor: int         # 1..5 (0 cuando es un comentario)
    comentario: str = ""
    fecha: str = ""    # ISO de cuando respondió


@dataclass
class ResultadoEnvioEncuesta:
    """Qué pasó al intentar enviar la encuesta a un cliente."""

    telefono: str
    estado: str        # "enviada" | "simulada" | "no_corresponde" | "ya_enviada" | "error"
    detalle: str = ""
    vista_previa: str = ""


@dataclass
class ReporteEncuestas:
    """Resumen de una corrida de envío de encuestas pendientes."""

    id_empresa: str
    numero_origen: str
    modo: str
    total: int = 0
    enviadas: int = 0
    simuladas: int = 0
    no_corresponde: int = 0   # todavía no pasaron 48 hs
    ya_enviadas: int = 0
    errores: int = 0
    resultados: list[ResultadoEnvioEncuesta] = field(default_factory=list)


def correr_encuestas_pendientes(
    id_empresa: str,
    ahora: datetime | None = None,
    dry_run: bool = True,
) -> ReporteEncuestas:
    """Envía las encuestas cuyo evento ya cumplió 48 hs y que no se enviaron aún.

    Lee `data/<id_empresa>/encuestas_pendientes.json` (lista de eventos de retiro
    o service). Pensado para que un scheduler (cron/APScheduler) lo llame seguido.
    """
    encontrado = buscar_por_empresa(id_empresa, LINEA_POSVENTA)
    if encontrado is None:
        raise EncuestaError(
            f"La empresa '{id_empresa}' no tiene línea de Posventa configurada."
        )
    numero_origen, ctx = encontrado

    plantilla = ctx.plantillas.get(PLANTILLA_ENCUESTA)
    if plantilla is None:
        raise EncuestaError(
            f"La Posventa de {ctx.empresa} no tiene la plantilla '{PLANTILLA_ENCUESTA}'."
        )

    eventos = _cargar_datos(id_empresa, "encuestas_pendientes.json")
    momento = ahora or datetime.now()
    repo = obtener_repo()

    config = obtener_config()
    usar_twilio = (not dry_run) and bool(
        config.twilio_account_sid and config.twilio_auth_token
    )
    reporte = ReporteEncuestas(
        id_empresa=id_empresa,
        numero_origen=numero_origen,
        modo="real" if usar_twilio else "simulado",
        total=len(eventos),
    )

    print("\n" + "=" * 64)
    print(f"📝 [ENCUESTAS] {ctx.empresa} · Posventa   Modo: {reporte.modo}")
    print("=" * 64)

    for evento in eventos:
        telefono = normalizar_telefono(evento.get("telefono"))
        tipo = evento.get("tipo", _TIPO_DEFECTO)
        referencia = evento.get("referencia", "")
        fecha_evento = evento.get("fecha_evento", "")

        if not telefono:
            reporte.errores += 1
            reporte.resultados.append(
                ResultadoEnvioEncuesta("?", "error", "teléfono inválido")
            )
            continue

        # ¿Ya pasaron las 48 hs del evento?
        if not _corresponde_enviar(fecha_evento, momento):
            reporte.no_corresponde += 1
            reporte.resultados.append(
                ResultadoEnvioEncuesta(telefono, "no_corresponde", "aún no cumplió 48 hs")
            )
            print(f"   ⏳ {telefono} · todavía no pasaron 48 hs")
            continue

        # Evitar reenviar la misma encuesta.
        if repo.encuesta_enviada(id_empresa, telefono, fecha_evento):
            reporte.ya_enviadas += 1
            reporte.resultados.append(
                ResultadoEnvioEncuesta(telefono, "ya_enviada", "encuesta ya enviada")
            )
            print(f"   ⏭️  {telefono} · ya enviada")
            continue

        # Texto de la 1ª pregunta y variables: {{1}}=nombre, {{2}}=referencia.
        preview = _texto_intro(id_empresa, tipo).format_map(
            _DefaultDict({**evento, "empresa": ctx.saludo})
        )
        variables = {"1": str(evento.get("nombre", "")), "2": str(referencia)}

        try:
            if usar_twilio:
                sid = enviar_plantilla(telefono, numero_origen, plantilla.sid, variables)
                reporte.enviadas += 1
                reporte.resultados.append(
                    ResultadoEnvioEncuesta(telefono, "enviada", sid, preview)
                )
                print(f"   ✅ {telefono} · enviada ({sid})")
            else:
                reporte.simuladas += 1
                reporte.resultados.append(
                    ResultadoEnvioEncuesta(telefono, "simulada", "dry-run", preview)
                )
                print(f"   🧪 {telefono} · simulada\n        pregunta: {preview}")

            repo.marcar_encuesta_enviada(id_empresa, telefono, fecha_evento)
            # Abrimos la encuesta (paso 0, sin respuestas) y cebamos la línea de
            # Posventa para capturar las respuestas del cliente cuando conteste.
            repo.abrir_encuesta(
                numero_origen,
                telefono,
                {
                    "id_empresa": id_empresa,
                    "tipo": tipo,
                    "referencia": referencia,
                    "nombre": str(evento.get("nombre", "")),
                    "paso": 0,
                    "respuestas": {},
                },
            )
            sesion.elegir_linea(numero_origen, telefono, LINEA_POSVENTA)
        except Exception as exc:  # noqa: BLE001
            reporte.errores += 1
            reporte.resultados.append(ResultadoEnvioEncuesta(telefono, "error", str(exc)))
            print(f"   ❌ {telefono} · error: {exc}")

    print(
        f"   Resumen: enviadas={reporte.enviadas} simuladas={reporte.simuladas} "
        f"sin_corresponder={reporte.no_corresponde} ya_enviadas={reporte.ya_enviadas} "
        f"errores={reporte.errores}"
    )
    return reporte


def hay_encuesta_abierta(numero_cuenta: str, telefono: str) -> bool:
    """True si hay una encuesta esperando respuestas de ese cliente."""
    return obtener_repo().encuesta_abierta(numero_cuenta, telefono) is not None


def registrar_respuesta(numero_cuenta: str, telefono: str, texto: str) -> str | None:
    """Avanza la encuesta con la respuesta del cliente y devuelve el próximo mensaje.

    Mientras la encuesta está abierta, esta función maneja TODO el diálogo:
      - puntaje 1-5 válido  → lo guarda y pasa a la pregunta siguiente;
      - puntaje inválido    → vuelve a preguntar lo mismo;
      - última pregunta     → pide un comentario opcional (y avisa si fue negativa);
      - comentario / "listo" → cierra y agradece;
      - "asesor"/"cancelar" → cierra la encuesta y devuelve None (sigue el flujo
        normal del enrutador, que deriva a un humano).

    Devuelve None sólo si NO hay encuesta abierta (o si el cliente la abandona),
    para que el enrutador siga con su lógica habitual.
    """
    repo = obtener_repo()
    contexto = repo.encuesta_abierta(numero_cuenta, telefono)
    if contexto is None:
        return None

    tipo = contexto.get("tipo", _TIPO_DEFECTO)
    id_empresa = contexto.get("id_empresa", "")
    preguntas = preguntas_de(id_empresa, tipo)
    paso = int(contexto.get("paso", 0) or 0)
    respuestas: dict[str, int] = dict(contexto.get("respuestas") or {})
    nombre = contexto.get("nombre", "")
    referencia = contexto.get("referencia", "")
    limpio = (texto or "").strip()

    # Salida: pidió un asesor o quiere cortar → cerramos y dejamos el flujo normal.
    if any(p in limpio.lower() for p in _ESCAPE):
        repo.cerrar_encuesta(numero_cuenta, telefono)
        return None

    # Paso del COMENTARIO final (ya respondió todas las preguntas).
    if paso >= len(preguntas):
        comentario = limpio if (limpio and limpio.lower() not in _SIN_COMENTARIO) else ""
        if comentario:
            _guardar(
                repo, id_empresa, telefono, tipo, referencia,
                pregunta=PREGUNTA_COMENTARIO, valor=0, comentario=comentario,
            )
            print(f"💬 [ENCUESTA] {telefono} dejó un comentario ({id_empresa})")
        # Writeback con el comentario incluido (actualiza la OR en el sistema interno).
        _writeback(contexto, telefono, respuestas, comentario)
        repo.cerrar_encuesta(numero_cuenta, telefono)
        return "¡Gracias de nuevo! 🙏 Tu opinión nos ayuda muchísimo a seguir mejorando."

    # Paso de una PREGUNTA: esperamos un puntaje 1-5.
    valor = _parsear_valor(limpio)
    if valor is None:
        return _texto_pregunta(paso, preguntas)  # no entendimos: re-preguntamos

    clave = preguntas[paso][0]
    respuestas[clave] = valor
    _guardar(repo, id_empresa, telefono, tipo, referencia, pregunta=clave, valor=valor)
    print(f"⭐ [ENCUESTA] {telefono} {clave}={valor}/5 ({id_empresa} · {tipo})")

    paso += 1
    repo.abrir_encuesta(
        numero_cuenta,
        telefono,
        {**contexto, "paso": paso, "respuestas": respuestas},
    )

    # ¿Quedan preguntas?
    if paso < len(preguntas):
        return "¡Gracias! 🙌\n\n" + _texto_pregunta(paso, preguntas)

    # Respondió todo → pedimos comentario y avisamos a calidad si fue negativa.
    if _es_negativa(respuestas):
        print(
            f"🚨 [CALIDAD] {telefono} dejó puntaje BAJO en {id_empresa}. "
            "Avisar al responsable de calidad."
        )
    # Writeback de los puntajes apenas se completan (sin esperar el comentario,
    # así un RQR llega al sistema interno aunque el cliente no comente).
    _writeback(contexto, telefono, respuestas, comentario="")
    return _cierre_preguntas(nombre, respuestas)


def tablero(id_empresa: str) -> dict:
    """Resumen de resultados de la empresa (el 'tablero'), con desglose por pregunta."""
    items = obtener_repo().resultados(id_empresa)
    puntajes = [r for r in items if 1 <= int(r.get("valor", 0)) <= 5]
    comentarios = [r for r in items if r.get("pregunta") == PREGUNTA_COMENTARIO]

    total = len(puntajes)
    promedio = round(sum(int(r["valor"]) for r in puntajes) / total, 2) if total else None
    distribucion = {
        str(n): sum(1 for r in puntajes if int(r["valor"]) == n) for n in range(1, 6)
    }

    # Promedio por pregunta (atención, calidad del trabajo, claridad, recomendación...).
    por_pregunta: dict[str, list[int]] = {}
    for r in puntajes:
        por_pregunta.setdefault(r.get("pregunta", ""), []).append(int(r["valor"]))
    promedio_pregunta = {
        clave: round(sum(vals) / len(vals), 2) for clave, vals in por_pregunta.items()
    }

    return {
        "id_empresa": id_empresa,
        "respuestas": total,
        "promedio": promedio,
        "distribucion": distribucion,
        "por_pregunta": promedio_pregunta,
        "comentarios": [
            {
                "telefono": c.get("telefono"),
                "texto": c.get("comentario", ""),
                "fecha": c.get("fecha"),
            }
            for c in comentarios
        ],
        "detalle": items,
    }


def limpiar() -> None:
    """Vacía el estado (sólo para tests, en backend de memoria)."""
    obtener_repo().limpiar_todo()


# ── Cuestionario configurable (editable desde el panel) ──────────────────────
def cuestionario(id_empresa: str) -> dict:
    """Cuestionario de la empresa: el editado en el panel o el de fábrica.

    Hace un merge defensivo: si la empresa editó un tipo, se usa el suyo; si le
    falta alguno (o nunca editó), se completa con CUESTIONARIO_DEFECTO.
    """
    base = copy.deepcopy(CUESTIONARIO_DEFECTO)
    guardado = obtener_repo().obtener_config_encuestas(id_empresa)
    if guardado:
        for tipo in TIPOS:
            bloque = guardado.get(tipo) or {}
            if bloque.get("preguntas"):
                base[tipo] = {
                    "encabezado": bloque.get("encabezado") or base[tipo]["encabezado"],
                    "preguntas": bloque["preguntas"],
                }
    return base


def preguntas_de(id_empresa: str, tipo: str) -> list[tuple[str, str]]:
    """Lista (clave, texto) de las preguntas de un tipo para una empresa."""
    conf = cuestionario(id_empresa)
    bloque = conf.get(tipo) or conf[_TIPO_DEFECTO]
    return [(p.get("clave", ""), p.get("texto", "")) for p in bloque.get("preguntas", [])]


def obtener_preguntas(id_empresa: str) -> dict:
    """Devuelve el cuestionario completo (para mostrarlo/editarlo en el panel)."""
    return cuestionario(id_empresa)


def guardar_preguntas(id_empresa: str, datos: dict) -> dict:
    """Valida y guarda el cuestionario editado desde el panel. Devuelve el guardado."""
    limpio = _validar_cuestionario(datos)
    obtener_repo().guardar_config_encuestas(id_empresa, limpio)
    return limpio


def _validar_cuestionario(datos: dict) -> dict:
    """Normaliza lo que llega del panel: descarta preguntas vacías y exige al menos una."""
    if not isinstance(datos, dict):
        raise EncuestaError("Formato del cuestionario inválido.")
    resultado: dict[str, dict] = {}
    for tipo in TIPOS:
        bloque = datos.get(tipo) or {}
        preguntas: list[dict] = []
        for i, p in enumerate(bloque.get("preguntas") or []):
            texto = (str(p.get("texto", "")) or "").strip()
            if not texto:
                continue
            clave = (str(p.get("clave", "")) or "").strip() or f"p{i + 1}"
            preguntas.append({"clave": clave, "texto": texto})
        if not preguntas:
            raise EncuestaError(
                f"La encuesta de '{ETIQUETA_TIPO.get(tipo, tipo)}' necesita al menos una pregunta."
            )
        encabezado = (
            str(bloque.get("encabezado", "")).strip()
            or CUESTIONARIO_DEFECTO[tipo]["encabezado"]
        )
        resultado[tipo] = {"encabezado": encabezado, "preguntas": preguntas}
    return resultado


# ── Helpers ──────────────────────────────────────────────────────────────────
def _writeback(contexto: dict, telefono: str, respuestas: dict, comentario: str) -> None:
    """Devuelve el resultado al sistema interno (best-effort; import diferido)."""
    try:
        from . import integracion

        integracion.enviar_writeback(contexto, telefono, respuestas, comentario)
    except Exception as exc:  # noqa: BLE001
        print(f"⚠️  [WRITEBACK] {exc}")


def _texto_intro(id_empresa: str, tipo: str) -> str:
    """Primer mensaje (cuerpo de la plantilla): encabezado + escala + 1ª pregunta."""
    conf = cuestionario(id_empresa)
    bloque = conf.get(tipo) or conf[_TIPO_DEFECTO]
    encabezado = bloque["encabezado"]
    primera = bloque["preguntas"][0]["texto"] if bloque.get("preguntas") else ""
    return (
        f"{encabezado}\nDel 1 al 5 (5 = excelente):\n1) {primera}\n\n"
        "Respondé con un número del 1 al 5. 🙏"
    )


def _texto_pregunta(paso: int, preguntas: list[tuple[str, str]]) -> str:
    """Texto de la pregunta `paso` (0-based), numerada y con la escala."""
    numero = paso + 1
    _, etiqueta = preguntas[paso]
    return f"{numero}) {etiqueta}\n_Respondé del 1 al 5 (5 = excelente)._"


def _cierre_preguntas(nombre: str, respuestas: dict[str, int]) -> str:
    """Mensaje tras la última pregunta: pide comentario (tono según el puntaje)."""
    saludo = f" {nombre}" if nombre else ""
    if _es_negativa(respuestas):
        return (
            f"Gracias por tomarte el tiempo{saludo} 🙏 Lamentamos que la experiencia "
            "no haya sido la mejor. Un responsable de calidad se va a contactar para "
            "ayudarte.\n\nSi querés contarnos qué pasó, escribilo acá (o *listo* para "
            "terminar)."
        )
    return (
        f"¡Excelente{saludo}! 🙌 Muchas gracias por tu tiempo.\n\nSi querés, dejanos "
        "un *comentario* para seguir mejorando (o escribí *listo*). ✨"
    )


def _es_negativa(respuestas: dict[str, int]) -> bool:
    """True si el cliente quedó insatisfecho (recomendación baja o promedio bajo)."""
    if respuestas.get("recomendacion", 5) <= 2:
        return True
    valores = list(respuestas.values())
    return bool(valores) and (sum(valores) / len(valores)) <= 2


def _guardar(
    repo,
    id_empresa: str,
    telefono: str,
    tipo: str,
    referencia: str,
    pregunta: str,
    valor: int,
    comentario: str = "",
) -> None:
    repo.guardar_resultado(
        asdict(
            ResultadoEncuesta(
                id_empresa=id_empresa,
                telefono=telefono,
                tipo=tipo,
                referencia=referencia,
                pregunta=pregunta,
                valor=valor,
                comentario=comentario,
                fecha=datetime.now().isoformat(timespec="seconds"),
            )
        )
    )


def _corresponde_enviar(fecha_evento: str, ahora: datetime) -> bool:
    """True si ya pasaron HORAS_ESPERA desde el evento."""
    try:
        momento_evento = datetime.fromisoformat(fecha_evento)
    except (TypeError, ValueError):
        return False
    return momento_evento + timedelta(hours=HORAS_ESPERA) <= ahora


def _parsear_valor(texto: str) -> int | None:
    """Interpreta la respuesta del cliente como un puntaje del 1 al 5."""
    limpio = (texto or "").strip()
    if limpio.isdigit():
        n = int(limpio)
        if 1 <= n <= 5:
            return n
    return None


class _DefaultDict(dict):
    def __missing__(self, _clave: str) -> str:
        return ""


def _cargar_datos(id_empresa: str, archivo: str) -> list[dict]:
    ruta = _DIR_DATOS / id_empresa / archivo
    if not ruta.exists():
        raise EncuestaError(f"No se encontró el archivo de datos: {ruta}")
    with ruta.open(encoding="utf-8") as f:
        datos = json.load(f)
    if not isinstance(datos, list):
        raise EncuestaError(f"El archivo {ruta} debe contener una lista de eventos.")
    return datos
