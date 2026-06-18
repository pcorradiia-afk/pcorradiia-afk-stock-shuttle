"""Encuestas de calidad automatizadas (caso de uso #3).

Flujo:
  1) ENVIAR: a las 48 hs de un retiro de ventas o de un service, manda la
     PRIMERA pregunta con una plantilla aprobada (inicia la conversación).
  2) CONVERSAR: una vez que el cliente responde, seguimos pregunta por pregunta
     DENTRO de la ventana de 24 hs. Cada pregunta es:
        - "escala" → puntaje 1-5 (se muestra como LISTA tappable en WhatsApp), o
        - "si_no"  → Sí/No (se muestra como 2 BOTONES tappables).
  3) COMENTARIO final opcional: el cliente puede escribir o mandar un AUDIO.
  4) GUARDAR: cada respuesta queda en el tablero de la empresa, con desglose por
     pregunta, y se devuelve al sistema interno por writeback.

Las preguntas se editan desde el panel (Herramientas → Encuestas). Si una
empresa no editó nada, se usan las de fábrica (CUESTIONARIO_DEFECTO).
"""

from __future__ import annotations

import copy
import json
import re
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

HORAS_ESPERA = 48
PLANTILLA_ENCUESTA = "encuesta_calidad"
PREGUNTA_COMENTARIO = "comentario"

TIPOS = ("taller", "ventas")
ETIQUETA_TIPO = {"taller": "Posventa / Taller", "ventas": "Ventas 0km"}
_TIPO_DEFECTO = "taller"

# Tipos de pregunta.
ESCALA = "escala"   # puntaje 1-5 (lista tappable)
SI_NO = "si_no"     # Sí / No (botones)

# ── CUESTIONARIO DE FÁBRICA (editable desde el panel) ─────────────────────────
CUESTIONARIO_DEFECTO: dict[str, dict] = {
    "taller": {
        "encabezado": (
            "¡Hola {nombre}! 👋 Soy Valentino, de {empresa}. Tu opinión nos ayuda "
            "a mejorar 💪🚗\n\nSobre tu paso por el taller con tu {referencia}:"
        ),
        "preguntas": [
            {"clave": "calidad_trabajo", "texto": "¿Cómo evaluás la *calidad del trabajo* realizado?", "tipo": ESCALA},
            {"clave": "atencion", "texto": "¿Cómo te sentiste con la *atención* recibida?", "tipo": ESCALA},
            {"clave": "claridad", "texto": "¿La *explicación de los trabajos* fue clara?", "tipo": ESCALA},
            {"clave": "recomendacion", "texto": "¿*Recomendarías* la marca y nuestro concesionario?", "tipo": SI_NO},
        ],
    },
    "ventas": {
        "encabezado": (
            "¡Hola {nombre}! 👋 Soy Valentino, de {empresa}. Tu opinión nos ayuda "
            "a mejorar 💪🚗\n\nSobre la compra de tu {referencia}:"
        ),
        "preguntas": [
            {"clave": "atencion", "texto": "¿Cómo fue la *atención* del vendedor?", "tipo": ESCALA},
            {"clave": "asesoramiento", "texto": "¿Qué tan conforme quedaste con el *asesoramiento*?", "tipo": ESCALA},
            {"clave": "entrega", "texto": "¿Cómo fue la *entrega* de tu vehículo?", "tipo": ESCALA},
            {"clave": "recomendacion", "texto": "¿*Recomendarías* la marca y nuestro concesionario?", "tipo": SI_NO},
        ],
    },
}

_PIE_INTRO = "\n\n_Elegí tu respuesta tocando una opción 👇 (1 al 5, donde 5 = excelente)._"

_ESCAPE = ("asesor", "humano", "cancelar", "salir", "basta")
_SIN_COMENTARIO = ("listo", "no", "nada", "gracias", "ninguno", "ok", "no gracias")


class EncuestaError(Exception):
    """Error de configuración de encuestas (empresa/plantilla/archivo inexistente)."""


@dataclass
class ResultadoEncuesta:
    """Una respuesta guardada en el tablero (puntaje por pregunta, o comentario)."""

    id_empresa: str
    telefono: str
    tipo: str
    referencia: str
    pregunta: str
    valor: int          # 1..5 (0 para comentario)
    comentario: str = ""
    fecha: str = ""


@dataclass
class RespuestaEncuesta:
    """Próximo mensaje del bot durante una encuesta (texto + cómo renderizarlo)."""

    texto: str                       # versión texto (simulador y fallback)
    cuerpo: str = ""                 # cuerpo para el mensaje interactivo (sin pie)
    interactivo: str | None = None   # ESCALA | SI_NO | None
    finalizar: bool = False

    def __post_init__(self) -> None:
        if not self.cuerpo:
            self.cuerpo = self.texto


@dataclass
class ResultadoEnvioEncuesta:
    telefono: str
    estado: str
    detalle: str = ""
    vista_previa: str = ""


@dataclass
class ReporteEncuestas:
    id_empresa: str
    numero_origen: str
    modo: str
    total: int = 0
    enviadas: int = 0
    simuladas: int = 0
    no_corresponde: int = 0
    ya_enviadas: int = 0
    errores: int = 0
    resultados: list[ResultadoEnvioEncuesta] = field(default_factory=list)


def correr_encuestas_pendientes(
    id_empresa: str,
    ahora: datetime | None = None,
    dry_run: bool = True,
) -> ReporteEncuestas:
    """Envía las encuestas cuyo evento ya cumplió 48 hs y que no se enviaron aún."""
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

        if not _corresponde_enviar(fecha_evento, momento):
            reporte.no_corresponde += 1
            reporte.resultados.append(
                ResultadoEnvioEncuesta(telefono, "no_corresponde", "aún no cumplió 48 hs")
            )
            print(f"   ⏳ {telefono} · todavía no pasaron 48 hs")
            continue

        if repo.encuesta_enviada(id_empresa, telefono, fecha_evento):
            reporte.ya_enviadas += 1
            reporte.resultados.append(
                ResultadoEnvioEncuesta(telefono, "ya_enviada", "encuesta ya enviada")
            )
            print(f"   ⏭️  {telefono} · ya enviada")
            continue

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


def registrar_respuesta(
    numero_cuenta: str,
    telefono: str,
    texto: str,
    media: dict | None = None,
) -> RespuestaEncuesta | None:
    """Avanza la encuesta con la respuesta del cliente.

    `media` describe un adjunto entrante (p. ej. audio): {"url": ..., "tipo": ...}.
    En el paso del comentario final, un audio cuenta como comentario válido.

    Devuelve el próximo mensaje del bot (RespuestaEncuesta), o None si NO hay
    encuesta abierta (o si el cliente la abandona pidiendo un asesor).
    """
    repo = obtener_repo()
    contexto = repo.encuesta_abierta(numero_cuenta, telefono)
    if contexto is None:
        return None

    tipo_enc = contexto.get("tipo", _TIPO_DEFECTO)
    id_empresa = contexto.get("id_empresa", "")
    preguntas = preguntas_de(id_empresa, tipo_enc)
    paso = int(contexto.get("paso", 0) or 0)
    respuestas: dict[str, int] = dict(contexto.get("respuestas") or {})
    nombre = contexto.get("nombre", "")
    referencia = contexto.get("referencia", "")
    limpio = (texto or "").strip()
    tiene_audio = bool(media and str(media.get("tipo", "")).startswith("audio"))

    # Salida: pide un asesor / cancelar (un audio NO se interpreta como salida).
    if not tiene_audio and any(p in limpio.lower() for p in _ESCAPE):
        repo.cerrar_encuesta(numero_cuenta, telefono)
        return None

    # Paso del COMENTARIO final (texto o audio).
    if paso >= len(preguntas):
        comentario = ""
        if tiene_audio:
            comentario = "[audio] " + str(media.get("url", ""))
        elif limpio and limpio.lower() not in _SIN_COMENTARIO:
            comentario = limpio
        if comentario:
            _guardar(
                repo, id_empresa, telefono, tipo_enc, referencia,
                pregunta=PREGUNTA_COMENTARIO, valor=0, comentario=comentario,
            )
            print(f"💬 [ENCUESTA] {telefono} dejó un comentario ({id_empresa})")
        _writeback(contexto, telefono, respuestas, comentario)
        repo.cerrar_encuesta(numero_cuenta, telefono)
        return RespuestaEncuesta(
            "¡Gracias de nuevo! 🙏 Tu opinión nos ayuda muchísimo a seguir mejorando.",
            finalizar=True,
        )

    # Paso de una PREGUNTA: interpretamos según su tipo.
    pregunta = preguntas[paso]
    if pregunta.get("tipo") == SI_NO:
        decision = _parsear_sino(limpio)
        if decision is None:
            return _pregunta_actual(paso, preguntas)  # no entendimos: re-preguntamos
        valor = 5 if decision else 1
    else:
        valor = _parsear_valor(limpio)
        if valor is None:
            return _pregunta_actual(paso, preguntas)

    clave = pregunta["clave"]
    respuestas[clave] = valor
    _guardar(repo, id_empresa, telefono, tipo_enc, referencia, pregunta=clave, valor=valor)
    print(f"⭐ [ENCUESTA] {telefono} {clave}={valor} ({id_empresa} · {tipo_enc})")

    paso += 1
    repo.abrir_encuesta(
        numero_cuenta, telefono, {**contexto, "paso": paso, "respuestas": respuestas}
    )

    if paso < len(preguntas):
        sig = _pregunta_actual(paso, preguntas)
        sig.texto = "¡Gracias! 🙌\n\n" + sig.texto
        sig.cuerpo = "¡Gracias! 🙌\n\n" + sig.cuerpo
        return sig

    # Respondió todo → pedimos comentario (texto o audio) y avisamos si fue negativa.
    if _es_negativa(respuestas):
        print(
            f"🚨 [CALIDAD] {telefono} dejó puntaje BAJO en {id_empresa}. "
            "Avisar al responsable de calidad."
        )
    _writeback(contexto, telefono, respuestas, comentario="")
    return RespuestaEncuesta(_cierre_preguntas(nombre, respuestas))


def tablero(id_empresa: str) -> dict:
    """Resumen de resultados de la empresa, con desglose por pregunta y % recomienda."""
    items = obtener_repo().resultados(id_empresa)
    escala = [
        r for r in items
        if r.get("pregunta") not in ("recomendacion", PREGUNTA_COMENTARIO)
        and 1 <= int(r.get("valor", 0)) <= 5
    ]
    recom = [r for r in items if r.get("pregunta") == "recomendacion"]
    comentarios = [r for r in items if r.get("pregunta") == PREGUNTA_COMENTARIO]

    total = len(escala)
    promedio = round(sum(int(r["valor"]) for r in escala) / total, 2) if total else None
    distribucion = {str(n): sum(1 for r in escala if int(r["valor"]) == n) for n in range(1, 6)}

    por_pregunta: dict[str, list[int]] = {}
    for r in escala:
        por_pregunta.setdefault(r.get("pregunta", ""), []).append(int(r["valor"]))
    promedio_pregunta = {k: round(sum(v) / len(v), 2) for k, v in por_pregunta.items()}

    recomienda_pct = (
        round(100 * sum(1 for r in recom if int(r["valor"]) >= 3) / len(recom))
        if recom else None
    )

    # Agrupado por cliente: una entrada por persona, con sus puntajes, si
    # recomienda, comentario, clasificación y si necesita seguimiento (RQR).
    por_tel: dict[str, dict] = {}
    for r in items:
        tel = r.get("telefono", "")
        g = por_tel.setdefault(tel, {
            "telefono": tel, "tipo": r.get("tipo", ""), "referencia": r.get("referencia", ""),
            "puntajes": {}, "recomienda": None, "comentario": "", "fecha": "",
        })
        preg = r.get("pregunta", "")
        if preg == PREGUNTA_COMENTARIO:
            g["comentario"] = r.get("comentario", "")
        elif preg == "recomendacion":
            g["recomienda"] = int(r.get("valor", 0)) >= 3
        elif preg:
            g["puntajes"][preg] = int(r.get("valor", 0))
        if str(r.get("fecha", "")) > g["fecha"]:
            g["fecha"] = str(r.get("fecha", ""))

    grupos = []
    for g in por_tel.values():
        vals = list(g["puntajes"].values())
        bajo = any(v <= 2 for v in vals) or g["recomienda"] is False
        medio = any(v == 3 for v in vals)
        g["clasificacion"] = "RQR" if bajo else ("Registrar" if medio else "Felicitacion")
        g["seguimiento"] = bajo
        grupos.append(g)
    grupos.sort(key=lambda x: x["fecha"], reverse=True)

    return {
        "id_empresa": id_empresa,
        "respuestas": total,
        "promedio": promedio,
        "distribucion": distribucion,
        "por_pregunta": promedio_pregunta,
        "recomienda_pct": recomienda_pct,
        "encuestas": grupos,
        "seguimiento": sum(1 for g in grupos if g["seguimiento"]),
        "comentarios": [
            {"telefono": c.get("telefono"), "texto": c.get("comentario", ""), "fecha": c.get("fecha")}
            for c in comentarios
        ],
        "detalle": items,
    }


def limpiar() -> None:
    obtener_repo().limpiar_todo()


# ── Cuestionario configurable ────────────────────────────────────────────────
def cuestionario(id_empresa: str) -> dict:
    """Cuestionario de la empresa: el editado en el panel o el de fábrica."""
    base = copy.deepcopy(CUESTIONARIO_DEFECTO)
    guardado = obtener_repo().obtener_config_encuestas(id_empresa)
    if guardado:
        for tipo in TIPOS:
            bloque = guardado.get(tipo) or {}
            if bloque.get("preguntas"):
                base[tipo] = {
                    "encabezado": bloque.get("encabezado") or base[tipo]["encabezado"],
                    "preguntas": [_normalizar_pregunta(p, i) for i, p in enumerate(bloque["preguntas"])],
                }
    return base


def preguntas_de(id_empresa: str, tipo: str) -> list[dict]:
    """Lista de preguntas (dicts con clave, texto, tipo) de un tipo para una empresa."""
    conf = cuestionario(id_empresa)
    bloque = conf.get(tipo) or conf[_TIPO_DEFECTO]
    return list(bloque.get("preguntas", []))


def obtener_preguntas(id_empresa: str) -> dict:
    return cuestionario(id_empresa)


def guardar_preguntas(id_empresa: str, datos: dict) -> dict:
    limpio = _validar_cuestionario(datos)
    obtener_repo().guardar_config_encuestas(id_empresa, limpio)
    return limpio


def _normalizar_pregunta(p: dict, i: int) -> dict:
    clave = (str(p.get("clave", "")) or "").strip() or f"p{i + 1}"
    tipo = str(p.get("tipo", "")).strip()
    if tipo not in (ESCALA, SI_NO):
        # Heurística: la pregunta de recomendación es Sí/No; el resto, escala 1-5.
        tipo = SI_NO if clave == "recomendacion" else ESCALA
    return {"clave": clave, "texto": str(p.get("texto", "")).strip(), "tipo": tipo}


def _validar_cuestionario(datos: dict) -> dict:
    if not isinstance(datos, dict):
        raise EncuestaError("Formato del cuestionario inválido.")
    resultado: dict[str, dict] = {}
    for tipo in TIPOS:
        bloque = datos.get(tipo) or {}
        preguntas: list[dict] = []
        for i, p in enumerate(bloque.get("preguntas") or []):
            norm = _normalizar_pregunta(p, i)
            if norm["texto"]:
                preguntas.append(norm)
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
    """Mensaje de inicio (cuerpo de la plantilla): saludo + la 1ª pregunta.

    La plantilla aprobada lleva los botones de la 1ª pregunta (1-5), así el
    cliente responde tocando desde el primer mensaje (sin un paso 'Comenzar').
    Este texto debe coincidir con el cuerpo de la plantilla aprobada en WhatsApp.
    """
    conf = cuestionario(id_empresa)
    bloque = conf.get(tipo) or conf[_TIPO_DEFECTO]
    primera = bloque["preguntas"][0]["texto"] if bloque.get("preguntas") else ""
    return f"{bloque['encabezado']}\n\n1) {primera}{_PIE_INTRO}"


def _pregunta_actual(paso: int, preguntas: list[dict]) -> RespuestaEncuesta:
    """Arma el mensaje de la pregunta `paso` (texto + tipo de interacción)."""
    p = preguntas[paso]
    numero = paso + 1
    cuerpo = f"{numero}) {p['texto']}"
    if p.get("tipo") == SI_NO:
        return RespuestaEncuesta(
            texto=f"{cuerpo}\n_Respondé *Sí* o *No*._", cuerpo=cuerpo, interactivo=SI_NO
        )
    return RespuestaEncuesta(
        texto=f"{cuerpo}\n_Elegí tu respuesta del 1 al 5 (5 = excelente)._",
        cuerpo=cuerpo, interactivo=ESCALA,
    )


def _cierre_preguntas(nombre: str, respuestas: dict[str, int]) -> str:
    saludo = f" {nombre}" if nombre else ""
    if _es_negativa(respuestas):
        return (
            f"Gracias por tomarte el tiempo{saludo} 🙏 Lamentamos que la experiencia "
            "no haya sido la mejor. Un responsable de calidad se va a contactar para "
            "ayudarte.\n\n¿Querés contarnos qué pasó? Podés *escribir* o mandar un "
            "*audio* 🎤 (o *listo* para terminar)."
        )
    return (
        f"¡Excelente{saludo}! 🙌 Muchas gracias por tu tiempo.\n\n¿Querés agregar algo "
        "más? Podés *escribir* un comentario o mandar un *audio* 🎤 (o *listo* para "
        "terminar). ✨"
    )


def _es_negativa(respuestas: dict[str, int]) -> bool:
    if respuestas.get("recomendacion", 5) <= 2:
        return True
    escala = [v for k, v in respuestas.items() if k != "recomendacion"]
    return bool(escala) and (sum(escala) / len(escala)) <= 2


def _guardar(
    repo, id_empresa: str, telefono: str, tipo: str, referencia: str,
    pregunta: str, valor: int, comentario: str = "",
) -> None:
    repo.guardar_resultado(
        asdict(
            ResultadoEncuesta(
                id_empresa=id_empresa, telefono=telefono, tipo=tipo,
                referencia=referencia, pregunta=pregunta, valor=valor,
                comentario=comentario, fecha=datetime.now().isoformat(timespec="seconds"),
            )
        )
    )


def _corresponde_enviar(fecha_evento: str, ahora: datetime) -> bool:
    try:
        momento_evento = datetime.fromisoformat(fecha_evento)
    except (TypeError, ValueError):
        return False
    return momento_evento + timedelta(hours=HORAS_ESPERA) <= ahora


def _parsear_valor(texto: str) -> int | None:
    """Interpreta la respuesta como puntaje 1-5 (número tipeado o id/título tappable)."""
    t = (texto or "").strip()
    if t.isdigit() and 1 <= int(t) <= 5:
        return int(t)
    if t[:1].isdigit() and 1 <= int(t[0]) <= 5:  # ej. "5 · Muy satisfecho"
        return int(t[0])
    return None


def _parsear_sino(texto: str) -> bool | None:
    """Interpreta Sí/No (tipeado o id 'si'/'no' del botón). None si no se entiende."""
    t = (texto or "").strip().lower()
    if t.startswith("no"):
        return False
    if t.startswith("sí") or t.startswith("si") or t in ("s", "👍"):
        return True
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
