"""Integración con Twilio: respuestas TwiML y envío saliente.

Separa dos responsabilidades:
  - Construir el menú interactivo de respuesta (TwiML) personalizado por marca.
  - Enviar mensajes proactivos (campañas, plantillas, multimedia) por la API.
"""

from __future__ import annotations

from twilio.twiml.messaging_response import MessagingResponse

from ..config import obtener_config
from ..marcas import Marca


def menu_bienvenida(marca: Marca) -> str:
    """Devuelve TwiML con un menú de bienvenida personalizado con la marca.

    WhatsApp por Twilio no renderiza botones nativos vía TwiML clásico, así que
    el "menú" se presenta como opciones numeradas que el cliente responde con un
    número. La detección de esas respuestas se maneja en el webhook.
    """
    respuesta = MessagingResponse()
    respuesta.message(
        f"¡Hola! 👋 Bienvenido/a a *{marca.saludo}* (oficial {marca.marca}).\n\n"
        "¿Con qué te puedo ayudar?\n"
        "1️⃣ Ver modelos y stock\n"
        "2️⃣ Consultar mi plan de ahorro\n"
        "3️⃣ Turnos de service / taller\n"
        "4️⃣ Hablar con un asesor\n\n"
        "Respondé con el número de la opción o escribime tu consulta. 🙂"
    )
    return str(respuesta)


def respuesta_texto(texto: str) -> str:
    """Envuelve un texto plano en TwiML para devolverlo desde el webhook."""
    respuesta = MessagingResponse()
    respuesta.message(texto)
    return str(respuesta)


def enviar_mensaje(numero_destino: str, numero_origen: str, cuerpo: str) -> str:
    """Envía un mensaje saliente por la API de Twilio (campañas, alertas, etc.).

    `numero_origen` es el número de WhatsApp de la marca; `numero_destino` el del
    cliente. Devuelve el SID del mensaje creado. Requiere credenciales válidas
    en el .env.
    """
    from twilio.rest import Client

    config = obtener_config()
    cliente = Client(config.twilio_account_sid, config.twilio_auth_token)
    mensaje = cliente.messages.create(
        from_=f"whatsapp:{numero_origen}",
        to=f"whatsapp:{numero_destino}",
        body=cuerpo,
    )
    return mensaje.sid
