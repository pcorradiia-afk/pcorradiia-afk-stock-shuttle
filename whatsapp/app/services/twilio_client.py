"""Integración con Twilio: respuestas TwiML y envío saliente.

Tres tipos de respuesta TwiML:
  - `menu_de_lineas`  → cuando un número atiende varias líneas y hay que elegir.
  - `menu_bienvenida` → menú de opciones DENTRO de una línea ya resuelta.
  - `respuesta_texto` → un texto plano cualquiera.

Y el envío saliente (`enviar_mensaje`) para campañas, plantillas y multimedia.
"""

from __future__ import annotations

import json

from twilio.twiml.messaging_response import MessagingResponse

from ..config import obtener_config
from ..marcas import (
    ETIQUETA_LINEA,
    LINEA_PLANES,
    LINEA_POSVENTA,
    LINEA_VENTAS,
    Contexto,
    Cuenta,
)

# Opciones del menú dentro de cada línea (texto genérico; la marca se inserta aparte).
OPCIONES_POR_LINEA: dict[str, list[str]] = {
    LINEA_PLANES: ["Estado de cuotas", "Adjudicaciones y licitaciones", "Entrega de unidad"],
    LINEA_VENTAS: ["Ver modelos y stock", "Financiación / plan de ahorro", "Cotizar mi usado"],
    LINEA_POSVENTA: ["Pedir turno de service", "Estado de mi reparación", "Encuesta de calidad"],
}


def menu_de_lineas(cuenta: Cuenta) -> str:
    """TwiML para que el cliente elija la línea cuando el número atiende varias."""
    respuesta = MessagingResponse()
    opciones = "\n".join(
        f"{i}️⃣ {ETIQUETA_LINEA[linea]}"
        for i, linea in enumerate(cuenta.lineas.keys(), start=1)
    )
    respuesta.message(
        f"¡Hola! 👋 Bienvenido/a a *{cuenta.marca.saludo}* "
        f"(oficial {cuenta.marca.marca}).\n\n"
        "¿Sobre qué tema necesitás ayuda?\n"
        f"{opciones}\n\n"
        "Respondé con el número del tema."
    )
    return str(respuesta)


def menu_bienvenida(ctx: Contexto) -> str:
    """TwiML con el menú de bienvenida, personalizado por marca si está definido."""
    respuesta = MessagingResponse()

    # Menú principal de la marca (ej. Pedro Corradi con sus 5 áreas).
    if ctx.marca.menu_opciones:
        desde = f" en la Patagonia desde {ctx.marca.anio_desde}" if ctx.marca.anio_desde else ""
        opciones = "\n".join(
            f"{i}️⃣ {texto} {emoji}"
            for i, (texto, emoji, _linea) in enumerate(ctx.marca.menu_opciones, start=1)
        )
        respuesta.message(
            f"👋 ¡Hola! Bienvenido/a a *{ctx.saludo}* — Concesionario Oficial "
            f"{ctx.nombre_marca}{desde}. 🚙\n\n"
            f"¿En qué te damos una mano hoy?\n{opciones}\n\n"
            "Respondé con el número, escribí *asesor* para hablar con una persona, "
            "o contame tu consulta. 🙌"
        )
        return str(respuesta)

    # Menú por línea (cuando la marca no tiene menú principal propio).
    opciones = OPCIONES_POR_LINEA.get(ctx.linea, [])
    lineas_menu = "\n".join(f"{i}️⃣ {txt}" for i, txt in enumerate(opciones, start=1))
    respuesta.message(
        f"*{ctx.saludo}* · {ctx.etiqueta_linea} ({ctx.nombre_marca}).\n\n"
        "¿Con qué te puedo ayudar?\n"
        f"{lineas_menu}\n\n"
        "Respondé con el número, escribí *asesor* para hablar con una persona, "
        "o contame tu consulta. 🙂"
    )
    return str(respuesta)


def respuesta_texto(texto: str) -> str:
    """Envuelve un texto plano en TwiML para devolverlo desde el webhook."""
    respuesta = MessagingResponse()
    respuesta.message(texto)
    return str(respuesta)


def enviar_mensaje(numero_destino: str, numero_origen: str, cuerpo: str) -> str:
    """Envía un mensaje de texto libre por la API de Twilio.

    Sólo sirve DENTRO de la ventana de 24 hs de sesión (cuando el cliente ya
    escribió). Para iniciar conversación (campañas) se usa `enviar_plantilla`.
    Devuelve el SID del mensaje creado. Requiere credenciales válidas.
    """
    cliente = _cliente_rest()
    mensaje = cliente.messages.create(
        from_=f"whatsapp:{numero_origen}",
        to=f"whatsapp:{numero_destino}",
        body=cuerpo,
    )
    return mensaje.sid


def enviar_plantilla(
    numero_destino: str,
    numero_origen: str,
    content_sid: str,
    variables: dict[str, str],
) -> str:
    """Envía una plantilla aprobada (HSM) por la API de Twilio.

    Para iniciar conversación fuera de la ventana de 24 hs (avisos masivos,
    adjudicaciones, etc.) WhatsApp EXIGE una plantilla aprobada. En Twilio se
    referencia por su `content_sid` (HX...) y se completan sus variables
    ({{1}}, {{2}}, ...) con `variables` (claves "1", "2", ...).

    Devuelve el SID del mensaje creado. Requiere credenciales válidas.
    """
    cliente = _cliente_rest()
    mensaje = cliente.messages.create(
        from_=f"whatsapp:{numero_origen}",
        to=f"whatsapp:{numero_destino}",
        content_sid=content_sid,
        content_variables=json.dumps(variables),
    )
    return mensaje.sid


def enviar_medios(
    numero_destino: str,
    numero_origen: str,
    cuerpo: str,
    media_urls: list[str],
) -> str:
    """Envía texto + imagen(es) en formato libre (cupones PDF, fotos de stock).

    Sólo válido DENTRO de la ventana de 24 hs de sesión. Para campañas que
    inician conversación, la imagen va en la plantilla (`enviar_plantilla`).
    Devuelve el SID del mensaje creado.
    """
    cliente = _cliente_rest()
    mensaje = cliente.messages.create(
        from_=f"whatsapp:{numero_origen}",
        to=f"whatsapp:{numero_destino}",
        body=cuerpo,
        media_url=media_urls,
    )
    return mensaje.sid


def enviar_typing(message_sid: str) -> None:
    """Muestra el indicador "escribiendo..." en WhatsApp mientras preparamos la respuesta.

    Twilio referencia el mensaje entrante (su SID), lo marca como leído y muestra
    el "escribiendo..." por hasta 25 segundos (o hasta que llega la respuesta).
    Ideal para tapar los segundos que tarda la IA en pensar.
    (API en Beta pública de Twilio.)
    """
    if not message_sid:
        return
    cliente = _cliente_rest()
    cliente.request(
        "POST",
        "https://messaging.twilio.com/v2/Indicators/Typing.json",
        data={"messageId": message_sid, "channel": "whatsapp"},
    )


# ── Mensajes interactivos para encuestas (lista 1-5 y botones Sí/No) ──────────
# Opciones fijas de la escala 1-5 (id → etiqueta tappable).
_ESCALA_ITEMS = [
    ("5", "5 · Muy satisfecho"),
    ("4", "4 · Satisfecho"),
    ("3", "3 · Neutral"),
    ("2", "2 · Poco satisfecho"),
    ("1", "1 · Nada satisfecho"),
]
_SINO_ACCIONES = [("si", "Sí 👍"), ("no", "No 👎")]

# Caché de ContentSid por (tipo, cuerpo) para no recrear plantillas iguales.
_CACHE_INTERACTIVO: dict[tuple[str, str], str] = {}


def _crear_content(payload: dict) -> str:
    """Crea un Content (Content API) y devuelve su ContentSid (HX...)."""
    import requests

    config = obtener_config()
    r = requests.post(
        "https://content.twilio.com/v1/Content",
        auth=(config.twilio_account_sid, config.twilio_auth_token),
        json=payload,
        timeout=20,
    )
    r.raise_for_status()
    return r.json()["sid"]


def _content_sid_encuesta(tipo: str, cuerpo: str) -> str:
    """Devuelve (creando/cacheando) el ContentSid de una pregunta interactiva.

    - `escala` → quick-reply con las 5 opciones 5→1 (se ven 5 y 4 sin tocar nada).
    - `si_no`  → 2 botones de respuesta rápida (ids "si"/"no").
    """
    clave = (tipo, cuerpo)
    if clave in _CACHE_INTERACTIVO:
        return _CACHE_INTERACTIVO[clave]

    sufijo = abs(hash(clave)) % 10**9
    if tipo == "si_no":
        payload = {
            "friendly_name": f"enc_sino_{sufijo}",
            "language": "es",
            "types": {
                "twilio/quick-reply": {
                    "body": cuerpo,
                    "actions": [{"title": t, "id": i} for i, t in _SINO_ACCIONES],
                }
            },
        }
    else:
        # Quick Reply (igual que la 1ª pregunta): muestra "5 · Muy satisfecho" y
        # "4 · Satisfecho" a la vista, sin tener que tocar "Elegir puntaje".
        payload = {
            "friendly_name": f"enc_escala_{sufijo}",
            "language": "es",
            "types": {
                "twilio/quick-reply": {
                    "body": cuerpo,
                    "actions": [
                        {"title": etiqueta, "id": idv}
                        for idv, etiqueta in _ESCALA_ITEMS
                    ],
                }
            },
        }
    sid = _crear_content(payload)
    _CACHE_INTERACTIVO[clave] = sid
    return sid


def enviar_pregunta_interactiva(
    numero_destino: str, numero_origen: str, tipo: str, cuerpo: str
) -> str:
    """Envía una pregunta de encuesta tappable (lista 1-5 o botones Sí/No)."""
    content_sid = _content_sid_encuesta(tipo, cuerpo)
    cliente = _cliente_rest()
    mensaje = cliente.messages.create(
        from_=f"whatsapp:{numero_origen}",
        to=f"whatsapp:{numero_destino}",
        content_sid=content_sid,
    )
    return mensaje.sid


def _cliente_rest():
    """Crea el cliente REST de Twilio con las credenciales del .env."""
    from twilio.rest import Client

    config = obtener_config()
    return Client(config.twilio_account_sid, config.twilio_auth_token)
