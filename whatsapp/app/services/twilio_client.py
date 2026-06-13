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
    """TwiML con el menú de opciones de una línea ya resuelta, con la marca."""
    respuesta = MessagingResponse()
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


def _cliente_rest():
    """Crea el cliente REST de Twilio con las credenciales del .env."""
    from twilio.rest import Client

    config = obtener_config()
    return Client(config.twilio_account_sid, config.twilio_auth_token)
