"""Servidor FastAPI — Puente de WhatsApp multi-marca del Grupo Fiorasi.

Expone el webhook ``POST /webhook`` que Twilio invoca cada vez que un cliente
escribe a uno de los números de las concesionarias. El flujo es:

    Cliente ──▶ WhatsApp ──▶ Twilio ──▶ POST /webhook (From, To, Body, MessageSid)
                                              │
                                              ▼
                         buscar_cuenta(To)  →  identifica marca + líneas del número
                                              │
                                              ▼
                  decidir_respuesta(cuenta, Body, From)  →  resuelve línea + TwiML
                                              │
                                              ▼
                              Twilio entrega la respuesta al cliente

Para correrlo en local:  uvicorn app.main:app --reload --port 8000
y exponerlo con:         ngrok http 8000
"""

from __future__ import annotations

from fastapi import FastAPI, Form, HTTPException, Request, Response

from .config import obtener_config
from .core.normalizacion import normalizar_telefono
from .marcas import ETIQUETA_LINEA, buscar_cuenta, cuentas_registradas
from .services.campanias import (
    CampaniaError,
    ReporteCampania,
    correr_adjudicaciones,
    correr_difusion_stock,
)
from .services.encuestas import (
    EncuestaError,
    ReporteEncuestas,
    correr_encuestas_pendientes,
    tablero,
)
from .services.enrutador import decidir_respuesta

app = FastAPI(
    title="Puente WhatsApp Multi-Marca · Grupo Fiorasi",
    version="0.1.0",
    description="Enrutamiento de WhatsApp por número de destino hacia la marca y línea correctas.",
)


@app.get("/")
def salud() -> dict[str, object]:
    """Endpoint de salud: confirma que el servicio está vivo y qué atiende cada número."""
    cuentas = cuentas_registradas()
    return {
        "servicio": "puente-whatsapp-multimarca",
        "estado": "ok",
        "cuentas_configuradas": [
            {
                "numero": numero,
                "empresa": c.marca.empresa,
                "marca": c.marca.marca,
                "lineas": [ETIQUETA_LINEA.get(l, l) for l in c.lineas],
            }
            for numero, c in cuentas.items()
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
    """Recibe el mensaje de Twilio, identifica la cuenta y responde con TwiML."""
    config = obtener_config()

    # (Opcional) Validación de firma de Twilio para rechazar peticiones falsas.
    if config.twilio_validar_firma and not _firma_valida(request, config.twilio_auth_token):
        print("🚫 [SEGURIDAD] Firma de Twilio inválida; se rechaza la petición.")
        return Response(status_code=403)

    # 1) Identificar la cuenta (marca + líneas) según el número de destino (To).
    cuenta = buscar_cuenta(To)
    cliente = normalizar_telefono(From)

    # 2) Log limpio en consola (lo que pide la consigna de la Fase 1).
    print("\n" + "=" * 64)
    print("📩 [WEBHOOK] Mensaje entrante de WhatsApp")
    print(f"   MessageSid : {MessageSid}")
    print(f"   De (cliente): {cliente}")
    print(f"   A (destino) : {normalizar_telefono(To)}")
    print(f"   Cuerpo      : «{Body}»")
    if cuenta is not None:
        lineas = ", ".join(ETIQUETA_LINEA.get(l, l) for l in cuenta.lineas)
        print(f"   ✅ Cuenta: {cuenta.marca.empresa} — {cuenta.marca.marca}  [{lineas}]")
    else:
        print("   ⚠️  Número de destino no registrado en ninguna cuenta.")
    print("=" * 64)

    # 3) Si el número no está mapeado, respondemos genérico (no rompemos el flujo).
    if cuenta is None:
        from .services.twilio_client import respuesta_texto

        return _twiml(
            respuesta_texto(
                "Gracias por tu mensaje. Estamos verificando tu consulta y te "
                "responderemos a la brevedad."
            )
        )

    # 4) Decidir la respuesta (resuelve la línea y aplica las reglas de la marca).
    twiml = decidir_respuesta(cuenta, Body, cliente, normalizar_telefono(To))

    # 5) Si la lógica decidió no responder (bot pausado), devolvemos 200 vacío.
    if twiml is None:
        return Response(status_code=200)

    return _twiml(twiml)


@app.post("/campanias/adjudicaciones/{id_empresa}")
def lanzar_adjudicaciones(id_empresa: str, dry_run: bool = True) -> ReporteCampania:
    """Lanza la campaña de adjudicaciones de Planes de Ahorro para una empresa.

    Por seguridad, ``dry_run=true`` por defecto: simula los envíos y muestra el
    reporte sin mandar nada por WhatsApp. Para enviar de verdad, pasá
    ``?dry_run=false`` (requiere credenciales de Twilio en el .env).

    Ejemplos::

        POST /campanias/adjudicaciones/empresa_pedro_corradi            (simula)
        POST /campanias/adjudicaciones/empresa_pedro_corradi?dry_run=false  (envía)
    """
    try:
        return correr_adjudicaciones(id_empresa, dry_run=dry_run)
    except CampaniaError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/campanias/difusion/{id_empresa}")
def lanzar_difusion(id_empresa: str, dry_run: bool = True) -> ReporteCampania:
    """Lanza la campaña de fidelización: difusión de stock con texto + imagen + botones.

    Igual que adjudicaciones, ``dry_run=true`` por defecto (simula). El mensaje
    lleva la foto de cada unidad y botones de respuesta ("Me interesa",
    "Ver financiación", "Hablar con asesor") que el cliente toca para contestar.

    Ejemplo::

        POST /campanias/difusion/empresa_pedro_corradi
    """
    try:
        return correr_difusion_stock(id_empresa, dry_run=dry_run)
    except CampaniaError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/encuestas/{id_empresa}/enviar")
def enviar_encuestas(id_empresa: str, dry_run: bool = True) -> ReporteEncuestas:
    """Envía las encuestas de calidad cuyo evento ya cumplió 48 hs.

    Pensado para que un scheduler (cron/APScheduler) lo llame periódicamente.
    ``dry_run=true`` por defecto (simula). Los eventos se leen de
    ``data/<id_empresa>/encuestas_pendientes.json``.
    """
    try:
        return correr_encuestas_pendientes(id_empresa, dry_run=dry_run)
    except EncuestaError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/encuestas/{id_empresa}/resultados")
def resultados_encuestas(id_empresa: str) -> dict:
    """Tablero de la empresa: cantidad de respuestas, promedio y distribución 1-5."""
    return tablero(id_empresa)


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
    return bool(firma) and validador.validate(url, {}, firma) is not False
