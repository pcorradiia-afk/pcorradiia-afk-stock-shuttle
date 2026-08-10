"""Crea (en Twilio) la plantilla de la 1ª pregunta de la encuesta con la escala
ordenada 5 → 1, y pide la aprobación a WhatsApp/Meta.

Por qué: la PRIMERA pregunta viaja dentro de una plantilla aprobada por Meta, así
que su orden de opciones está congelado ahí. Las demás preguntas ya salen 5→1
desde el código. Este script regenera SOLO la plantilla, ordenada 5→1.

Uso (con las credenciales de Twilio en el entorno):

    TWILIO_ACCOUNT_SID=AC... TWILIO_AUTH_TOKEN=... \
        python scripts/crear_plantilla_encuesta.py

Pasos siguientes (te los imprime al final):
    1) Esperar la aprobación de WhatsApp (Twilio Console → Content Template Builder).
    2) Pegar el nuevo ContentSid (HX...) en app/marcas.py, en "encuesta_calidad".
"""
from __future__ import annotations

import os
import sys

import requests

# La escala, ordenada de MEJOR a peor (5 primero, como pidió el cliente).
ESCALA_ITEMS = [
    ("5", "5 · Muy satisfecho"),
    ("4", "4 · Satisfecho"),
    ("3", "3 · Neutral"),
    ("2", "2 · Poco satisfecho"),
    ("1", "1 · Nada satisfecho"),
]

# Cuerpo de la plantilla. {{1}} = nombre del cliente, {{2}} = vehículo/referencia.
# Debe coincidir con el texto que arma el sistema (encuestas._texto_intro).
CUERPO = (
    "¡Hola {{1}}! 👋 Soy Valentino, de Pedro Corradi (Ford). "
    "Tu opinión nos ayuda a mejorar 💪🚗\n\n"
    "Sobre tu paso por el taller con tu {{2}}:\n\n"
    "1) ¿Cómo calificás la *calidad del trabajo*?\n\n"
    "_Elegí tu respuesta tocando una opción 👇 (1 al 5, donde 5 = excelente)._"
)

FRIENDLY_NAME = "encuesta_calidad_taller_pc"   # nombre interno en Twilio
BOTON_LISTA = "Elegir puntaje"                 # texto del botón que abre la lista


def main() -> int:
    sid = os.environ.get("TWILIO_ACCOUNT_SID")
    token = os.environ.get("TWILIO_AUTH_TOKEN")
    if not sid or not token:
        print("❌ Falta TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN en el entorno.")
        return 1

    auth = (sid, token)

    # 1) Crear el Content (lista 5→1).
    payload = {
        "friendly_name": FRIENDLY_NAME,
        "language": "es",
        "variables": {"1": "Cliente", "2": "tu vehículo"},
        "types": {
            "twilio/list-picker": {
                "body": CUERPO,
                "button": BOTON_LISTA,
                "items": [
                    {"item": etiqueta, "id": idv, "description": ""}
                    for idv, etiqueta in ESCALA_ITEMS
                ],
            }
        },
    }
    r = requests.post(
        "https://content.twilio.com/v1/Content", auth=auth, json=payload, timeout=20
    )
    if not r.ok:
        print(f"❌ Error creando la plantilla: {r.status_code} {r.text}")
        return 1
    content_sid = r.json()["sid"]
    print(f"✅ Plantilla creada: {content_sid}")

    # 2) Pedir aprobación a WhatsApp (categoría UTILITY: encuesta postventa).
    aprob = requests.post(
        f"https://content.twilio.com/v1/Content/{content_sid}/ApprovalRequests/whatsapp",
        auth=auth,
        json={"name": FRIENDLY_NAME, "category": "UTILITY"},
        timeout=20,
    )
    if aprob.ok:
        estado = aprob.json().get("whatsapp", {}).get("status", "pendiente")
        print(f"📨 Aprobación solicitada a WhatsApp. Estado: {estado}")
    else:
        print(
            "⚠️  No se pudo pedir la aprobación automática "
            f"({aprob.status_code} {aprob.text}).\n"
            "    Pedíla a mano en Twilio Console → Content Template Builder."
        )

    print("\nSiguientes pasos:")
    print("  1) Esperá que WhatsApp apruebe la plantilla (Twilio Console).")
    print(f"  2) Pegá este ContentSid en app/marcas.py (encuesta_calidad): {content_sid}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
