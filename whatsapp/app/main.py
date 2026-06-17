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

import secrets
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.responses import HTMLResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from .config import obtener_config
from .core.normalizacion import normalizar_telefono
from .marcas import ETIQUETA_LINEA, buscar_cuenta, cuentas_registradas
from .services.scheduler import detener_scheduler, iniciar_scheduler
from .services.campanias import (
    CampaniaError,
    ReporteCampania,
    correr_adjudicaciones,
    correr_difusion_stock,
)
from .services.documentos import (
    DocumentoError,
    ReporteDocumentos,
    ResultadoDocumento,
    correr_cupones,
    enviar_documento,
)
from .services.encuestas import (
    EncuestaError,
    ReporteEncuestas,
    correr_encuestas_pendientes,
    tablero,
)
from .services.enrutador import decidir_respuesta

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Enciende el scheduler al arrancar y lo apaga al cerrar."""
    _configurar_sandbox()
    iniciar_scheduler()
    yield
    detener_scheduler()


def _configurar_sandbox() -> None:
    """Si hay un Sandbox de Twilio en el .env, lo mapea a una marca para probar."""
    from .marcas import registrar_numero_prueba

    config = obtener_config()
    if not (config.sandbox_numero and config.sandbox_empresa):
        return
    try:
        cuenta = registrar_numero_prueba(
            config.sandbox_numero, config.sandbox_empresa, config.sandbox_linea
        )
        print(
            f"🧪 [SANDBOX] {normalizar_telefono(config.sandbox_numero)} → "
            f"{cuenta.marca.empresa} · {config.sandbox_linea}"
        )
    except ValueError as exc:
        print(f"🧪 [SANDBOX] No se pudo configurar: {exc}")


app = FastAPI(
    title="Puente WhatsApp Multi-Marca · Grupo Fiorasi",
    version="0.1.0",
    description="Enrutamiento de WhatsApp por número de destino hacia la marca y línea correctas.",
    lifespan=lifespan,
)

# --- Acceso al panel: clave simple (HTTP Basic) ---
# Si PANEL_USUARIO y PANEL_CLAVE están vacíos, el panel queda abierto (modo prueba).
# Cuando los completes en el .env / Render, pide usuario y contraseña para entrar.
_seguridad = HTTPBasic(auto_error=False)


def requiere_clave(cred: HTTPBasicCredentials | None = Depends(_seguridad)) -> None:
    config = obtener_config()
    if not (config.panel_usuario and config.panel_clave):
        return  # sin clave configurada → abierto (sirve para probar)
    valido = (
        cred is not None
        and secrets.compare_digest(cred.username, config.panel_usuario)
        and secrets.compare_digest(cred.password, config.panel_clave)
    )
    if not valido:
        raise HTTPException(
            status_code=401,
            detail="Acceso restringido",
            headers={"WWW-Authenticate": "Basic"},
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

    # 2.b) Mostrar "escribiendo..." mientras preparamos la respuesta (también
    #      marca el mensaje como leído). Sólo si hay credenciales de Twilio.
    if config.twilio_account_sid and config.twilio_auth_token and MessageSid:
        from .services.twilio_client import enviar_typing

        try:
            enviar_typing(MessageSid)
        except Exception as exc:  # noqa: BLE001 — el typing es "lindo de tener", no crítico
            print(f"⚠️  [TYPING] No se pudo enviar el indicador: {exc}")

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


@app.post("/campanias/adjudicaciones/{id_empresa}", dependencies=[Depends(requiere_clave)])
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


@app.post("/campanias/difusion/{id_empresa}", dependencies=[Depends(requiere_clave)])
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


@app.post("/encuestas/{id_empresa}/enviar", dependencies=[Depends(requiere_clave)])
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


@app.get("/encuestas/{id_empresa}/resultados", dependencies=[Depends(requiere_clave)])
def resultados_encuestas(id_empresa: str) -> dict:
    """Tablero de la empresa: cantidad de respuestas, promedio y distribución 1-5."""
    return tablero(id_empresa)


@app.get("/encuestas/{id_empresa}/preguntas", dependencies=[Depends(requiere_clave)])
def leer_preguntas_encuesta(id_empresa: str) -> dict:
    """Devuelve el cuestionario (taller y ventas) para editarlo en el panel."""
    from .services.encuestas import obtener_preguntas

    return obtener_preguntas(id_empresa)


@app.post("/encuestas/{id_empresa}/preguntas", dependencies=[Depends(requiere_clave)])
async def guardar_preguntas_encuesta(id_empresa: str, request: Request) -> dict:
    """Guarda el cuestionario editado desde el panel (preguntas de taller y ventas)."""
    from .services.encuestas import guardar_preguntas

    datos = await request.json()
    try:
        return guardar_preguntas(id_empresa, datos)
    except EncuestaError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/documentos/cupones/{id_empresa}")
def lanzar_cupones(id_empresa: str, dry_run: bool = True) -> ReporteDocumentos:
    """Lanza la campaña de cupones de pago en PDF (caso #4) para una empresa.

    ``dry_run=true`` por defecto (simula). Lee ``data/<id_empresa>/cupones.json``.
    """
    try:
        return correr_cupones(id_empresa, dry_run=dry_run)
    except DocumentoError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/documentos/enviar/{id_empresa}/{linea}")
def enviar_documento_individual(
    id_empresa: str,
    linea: str,
    telefono: str,
    url: str,
    cuerpo: str = "Te enviamos el documento solicitado.",
    dry_run: bool = True,
) -> ResultadoDocumento:
    """Envía un documento (contrato/PDF) a un cliente en conversación.

    Ejemplo::

        POST /documentos/enviar/empresa_pedro_corradi/ventas
             ?telefono=+5493515551234&url=https://.../contrato.pdf&cuerpo=Tu+contrato
    """
    try:
        return enviar_documento(id_empresa, linea, telefono, url, cuerpo, dry_run=dry_run)
    except DocumentoError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/scheduler", dependencies=[Depends(requiere_clave)])
def estado_scheduler() -> dict:
    """Estado del scheduler: jobs activos y próxima ejecución."""
    from .services.scheduler import _scheduler

    config = obtener_config()
    return {
        "activo": _scheduler.running,
        "intervalo_min": config.scheduler_intervalo_min,
        "modo": "simula" if config.encuestas_dry_run else "envía",
        "jobs": [
            {"id": j.id, "proxima_ejecucion": str(j.next_run_time)}
            for j in _scheduler.get_jobs()
        ],
    }


@app.get("/panel", response_class=HTMLResponse, dependencies=[Depends(requiere_clave)])
def panel_campanias() -> str:
    """Panel web para lanzar campañas del Óvalo (subir CSV, elegir a quién, enviar)."""
    return (Path(__file__).parent / "panel.html").read_text(encoding="utf-8")


@app.post("/ovalo/analizar", dependencies=[Depends(requiere_clave)])
async def ovalo_analizar(archivo: UploadFile = File(...)) -> dict:
    """Lee el CSV del Óvalo y devuelve el resumen para armar el selector."""
    from .services.ovalo import analizar, parsear_csv

    clientes = parsear_csv(await archivo.read())
    return analizar(clientes)


@app.post("/ovalo/enviar", dependencies=[Depends(requiere_clave)])
async def ovalo_enviar(
    archivo: UploadFile = File(...),
    cuerpo: str = Form(...),
    id_empresa: str = Form("empresa_pedro_corradi"),
    campania: str = Form("ovalo"),
    modelos: str = Form(""),       # seleccionados, separados por "||" (vacío = todos)
    situaciones: str = Form(""),   # seleccionadas, separadas por "||" (vacío = todas)
    imagen_url: str = Form(""),
    dry_run: bool = Form(True),
):
    """Filtra por modelo/situación y envía (o simula) la campaña a la selección."""
    from .services.ovalo import correr, filtrar, parsear_csv

    clientes = parsear_csv(await archivo.read())
    seleccion = filtrar(
        clientes,
        modelos=[m for m in modelos.split("||") if m] or None,
        situaciones=[s for s in situaciones.split("||") if s] or None,
    )
    try:
        return correr(
            id_empresa, campania, seleccion, cuerpo,
            imagen_url=imagen_url or None, dry_run=dry_run,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/ovalo/prueba", dependencies=[Depends(requiere_clave)])
async def ovalo_prueba(
    telefono: str = Form(...),
    cuerpo: str = Form(...),
    imagen_url: str = Form(""),
    botones: str = Form(""),   # botones separados por coma (máx 3)
) -> dict:
    """Envía un mensaje de PRUEBA (texto + imagen o botones) a un número del Sandbox."""
    from .services.ovalo import enviar_prueba

    lista_botones = [b.strip() for b in botones.split(",") if b.strip()]
    return enviar_prueba(telefono, cuerpo, imagen_url or None, lista_botones or None)


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
