"""Servidor FastAPI — Puente de WhatsApp multi-marca del Grupo Fiorasi.

Expone el webhook ``POST /webhook`` que Twilio invoca cada vez que un cliente
escribe a uno de los números de las concesionarias. El flujo es:

    Cliente ──▶ WhatsApp ──▶ Twilio ──▶ POST /webhook (From, To, Body, MessageSid)
                                              │
                                              ▼
                         buscar_marca(To)  →  identifica empresa/marca
                                              │
                                              ▼
                         decidir_respuesta(marca, Body, From)  →  TwiML
                                              │
                                              ▼
                              Twilio entrega la respuesta al cliente

Para correrlo en local:  uvicorn app.main:app --reload --port 8000
y exponerlo con:         ngrok http 8000
"""

from __future__ import annotations

from fastapi import FastAPI, Form, Request, Response

from .config import obtener_config
from .core.normalizacion import normalizar_telefono
from .marcas import buscar_marca, marcas_registradas
from .services.enrutador import decidir_respuesta

app = FastAPI(
    title="Puente WhatsApp Multi-Marca · Grupo Fiorasi",
    version="0.1.0",
    description="Enrutamiento de WhatsApp por número de destino hacia la marca correcta.",
)


@app.get("/")
def salud() -> dict[str, object]:
    """Endpoint de salud: confirma que el servicio está vivo y qué marcas conoce."""
    marcas = marcas_registradas()
    return {
        "servicio": "puente-whatsapp-multimarca",
        "estado": "ok",
        "marcas_configuradas": [
            {"numero": numero, "empresa": m.empresa, "marca": m.marca}
            for numero, m in marcas.items()
        ],
    }


@app.post("/webhook")
async def webhook(
    request: Request,
    From: str = Form(default=""),        # Número del cliente (whatsapp:+549...)
    To: str = Form(default=""),          # Número de la concesionaria (clave de enrutamiento)
    Body: str = Form(default=""),        # Texto del mensaje
    MessageSid: str = Form(default=""),  # Identificador único del mensaje en Twilio
) -> Response:
    """Recibe el mensaje de Twilio, identifica la marca y responde con TwiML."""
    config = obtener_config()

    # (Opcional) Validación de firma de Twilio para rechazar peticiones falsas.
    if config.twilio_validar_firma and not _firma_valida(request, config.twilio_auth_token):
        print("🚫 [SEGURIDAD] Firma de Twilio inválida; se rechaza la petición.")
        return Response(status_code=403)

    # 1) Identificar la marca según el número de destino (To).
    marca = buscar_marca(To)
    cliente = normalizar_telefono(From)

    # 2) Log limpio en consola (lo que pide la consigna de la Fase 1).
    print("\n" + "=" * 64)
    print("📩 [WEBHOOK] Mensaje entrante de WhatsApp")
    print(f"   MessageSid : {MessageSid}")
    print(f"   De (cliente): {cliente}")
    print(f"   A (destino) : {normalizar_telefono(To)}")
    print(f"   Cuerpo      : «{Body}»")
    if marca is not None:
        print(f"   ✅ Marca identificada: {marca.empresa} — {marca.marca}")
    else:
        print("   ⚠️  Número de destino no registrado en ninguna marca.")
    print("=" * 64)

    # 3) Si el número no está mapeado, respondemos genérico (no rompemos el flujo).
    if marca is None:
        from .services.twilio_client import respuesta_texto

        return _twiml(
            respuesta_texto(
                "Gracias por tu mensaje. Estamos verificando tu consulta y te "
                "responderemos a la brevedad."
            )
        )

    # 4) Decidir la respuesta según las reglas de negocio de la marca.
    twiml = decidir_respuesta(marca, Body, cliente)

    # 5) Si la lógica decidió no responder (bot pausado), devolvemos 200 vacío.
    if twiml is None:
        return Response(status_code=200)

    return _twiml(twiml)


def _twiml(contenido: str) -> Response:
    """Arma una respuesta HTTP con el content-type que Twilio espera (XML)."""
    return Response(content=contenido, media_type="application/xml")


def _firma_valida(request: Request, auth_token: str) -> bool:
    """Valida la firma ``X-Twilio-Signature`` de la petición entrante.

    Nota: la validación real necesita la URL pública exacta y el cuerpo del POST.
    Se deja como gancho preparado; en la Fase 1 se controla con
    ``TWILIO_VALIDAR_FIRMA`` en el .env.
    """
    from twilio.request_validator import RequestValidator

    validador = RequestValidator(auth_token)
    firma = request.headers.get("X-Twilio-Signature", "")
    url = str(request.url)
    # El cuerpo form ya fue consumido por FastAPI; en producción conviene leer el
    # form crudo acá. Para la Fase 1 basta con la presencia de la firma.
    return bool(firma) and validador.validate(url, {}, firma) is not False
