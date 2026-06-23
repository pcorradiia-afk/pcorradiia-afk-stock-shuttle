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

import html
import re
import secrets
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    Header,
    HTTPException,
    Request,
    Response,
    UploadFile,
)
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


def _usuarios_panel() -> dict[str, str]:
    """Usuarios válidos del panel: el simple + los de PANEL_USUARIOS ('user:clave,...')."""
    config = obtener_config()
    usuarios: dict[str, str] = {}
    if config.panel_usuario and config.panel_clave:
        usuarios[config.panel_usuario] = config.panel_clave
    for par in (config.panel_usuarios or "").split(","):
        par = par.strip()
        if ":" in par:
            usuario, clave = par.split(":", 1)
            if usuario.strip() and clave.strip():
                usuarios[usuario.strip()] = clave.strip()
    return usuarios


def requiere_clave(cred: HTTPBasicCredentials | None = Depends(_seguridad)) -> None:
    usuarios = _usuarios_panel()
    if not usuarios:
        return  # sin usuarios configurados → abierto (sirve para probar)
    esperada = usuarios.get(cred.username, "") if cred is not None else ""
    valido = bool(esperada) and secrets.compare_digest(cred.password, esperada)
    if not valido:
        raise HTTPException(
            status_code=401,
            detail="Acceso restringido",
            headers={"WWW-Authenticate": "Basic"},
        )


def requiere_token(x_api_token: str | None = Header(default=None)) -> None:
    """Autenticación de la API de integración (sistema interno → /eventos).

    Si API_TOKEN está vacío, el endpoint queda abierto (sólo para probar).
    Cuando lo completes, exige la cabecera ``X-API-Token`` con ese valor.
    """
    config = obtener_config()
    if not config.api_token:
        return
    if not (x_api_token and secrets.compare_digest(x_api_token, config.api_token)):
        raise HTTPException(status_code=401, detail="Token de API inválido")


@app.get("/usuarios", dependencies=[Depends(requiere_clave)])
def usuarios_panel() -> dict:
    """Lista los usuarios del panel dados de alta (sin las claves)."""
    nombres = sorted(_usuarios_panel().keys())
    return {"cantidad": len(nombres), "usuarios": nombres}


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
    NumMedia: str = Form(default="0"),   # Cantidad de adjuntos (audio, imagen...)
    MediaUrl0: str = Form(default=""),   # URL del primer adjunto
    MediaContentType0: str = Form(default=""),  # Tipo del primer adjunto (ej. audio/ogg)
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
    media = None
    try:
        if int(NumMedia or "0") > 0 and MediaUrl0:
            media = {"url": MediaUrl0, "tipo": MediaContentType0}
    except ValueError:
        media = None
    twiml = decidir_respuesta(cuenta, Body, cliente, normalizar_telefono(To), media=media)

    # Registrar la conversación (alimenta el buzón de Conversaciones y la memoria).
    _registrar_conversacion(
        normalizar_telefono(To), cliente, Body, twiml, es_media=bool(media)
    )

    # 5) Si la lógica decidió no responder (bot pausado), devolvemos 200 vacío.
    if twiml is None:
        return Response(status_code=200)

    return _twiml(twiml)


@app.post("/eventos", dependencies=[Depends(requiere_token)])
async def recibir_evento_interno(request: Request, dry_run: bool | None = None) -> dict:
    """Recibe un evento del sistema interno y manda la encuesta por WhatsApp.

    Lo llama el sistema in-house (al cerrar/entregar una OR, o con un botón). El
    cuerpo es JSON genérico (sirve para servicio, ventas, repuestos, entregas…)::

        POST /eventos      (cabecera X-API-Token: <token>)
        {
          "tipo": "servicio",
          "id_externo": "OR-489826",
          "cliente": "Francisco Mendez",
          "telefono": "+542804320238",
          "referencia": "Ford Transit AG299EX",
          "sucursal": "Trelew",
          "fecha_evento": "2026-06-06T11:22"
        }

    Cuando el cliente responde, el resultado se devuelve al sistema interno por
    writeback (si WRITEBACK_URL está configurada).
    """
    from .services.integracion import recibir_evento

    evento = await request.json()
    return recibir_evento(evento, dry_run=dry_run)


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


@app.post("/encuestas/prueba", dependencies=[Depends(requiere_clave)])
async def encuesta_prueba(request: Request) -> dict:
    """Manda la encuesta REAL a un WhatsApp para probarla en el teléfono.

    Si la línea tiene plantilla APROBADA (Taller), manda el mensaje de inicio como
    plantilla (business-initiated: no hace falta que el cliente escriba antes).
    Si no hay plantilla (ej. Ventas), manda la 1ª pregunta interactiva dentro de
    la charla (requiere que el cliente haya escrito 'hola' en las últimas 24 hs).
    """
    from .marcas import LINEA_POSVENTA, LINEA_VENTAS, buscar_por_empresa
    from .persistencia import obtener_repo
    from .services import encuestas, sesion
    from .services.integracion import recibir_evento
    from .services.twilio_client import enviar_pregunta_interactiva

    datos = await request.json()
    telefono = normalizar_telefono(datos.get("telefono", ""))
    if not telefono:
        raise HTTPException(status_code=400, detail="Falta el teléfono (+549...).")

    es_ventas = str(datos.get("tipo", "taller")).lower() in ("ventas", "entrega", "0km")
    tipo_enc = "ventas" if es_ventas else "taller"
    linea = LINEA_VENTAS if es_ventas else LINEA_POSVENTA
    nombre = str(datos.get("nombre", ""))
    referencia = str(datos.get("referencia", "Ford Ranger"))

    enc = buscar_por_empresa("empresa_pedro_corradi", linea)
    if enc is None:
        raise HTTPException(status_code=400, detail="No hay línea configurada.")
    numero_origen, ctx = enc
    obtener_repo().reiniciar_conversacion(numero_origen, telefono)  # arrancamos limpio

    # Si hay plantilla aprobada → mandamos el mensaje REAL (sin 'hola' previo).
    if ctx.plantillas.get(encuestas.PLANTILLA_ENCUESTA) is not None:
        evento = {
            "tipo": "ventas" if es_ventas else "servicio",
            "cliente": nombre, "telefono": telefono,
            "referencia": referencia, "empresa": "empresa_pedro_corradi",
        }
        res = recibir_evento(evento, dry_run=False)
        if res.get("estado") == "enviada":
            return {"estado": "enviada", "detalle": res.get("detalle"), "destino": telefono}
        return {"estado": "error", "detalle": res.get("detalle", "No se pudo enviar la plantilla.")}

    # Sin plantilla (ej. Ventas) → 1ª pregunta interactiva dentro de la charla.
    preguntas = encuestas.preguntas_de("empresa_pedro_corradi", tipo_enc)
    if not preguntas:
        raise HTTPException(status_code=400, detail="No hay preguntas configuradas.")
    repo = obtener_repo()
    repo.abrir_encuesta(numero_origen, telefono, {
        "id_empresa": "empresa_pedro_corradi", "tipo": tipo_enc,
        "referencia": referencia, "nombre": nombre, "paso": 0, "respuestas": {},
    })
    sesion.elegir_linea(numero_origen, telefono, linea)
    conf = encuestas.cuestionario("empresa_pedro_corradi")
    encabezado = conf[tipo_enc]["encabezado"].format_map(
        encuestas._DefaultDict({"nombre": nombre, "empresa": ctx.saludo, "referencia": referencia})
    )
    cuerpo = f"{encabezado}\n\n1) {preguntas[0]['texto']}"
    try:
        sid = enviar_pregunta_interactiva(
            telefono, numero_origen, preguntas[0].get("tipo", "escala"), cuerpo
        )
        return {"estado": "enviada", "sid": sid, "destino": telefono}
    except Exception as exc:  # noqa: BLE001
        return {
            "estado": "error",
            "detalle": (
                f"{exc} — (Ventas todavía no tiene plantilla aprobada: escribile *hola* "
                "al bot desde ese WhatsApp y reintentá.)"
            ),
        }


@app.post("/encuestas/analizar-excel", dependencies=[Depends(requiere_clave)])
async def encuestas_analizar_excel(archivo: UploadFile = File(...)) -> dict:
    """Lee el Excel de Calidad y devuelve el resumen (cuántas se enviarían)."""
    from .services.encuestas_masivo import analizar, parsear_excel

    filas = parsear_excel(await archivo.read())
    return analizar(filas)


@app.post("/encuestas/enviar-excel", dependencies=[Depends(requiere_clave)])
async def encuestas_enviar_excel(
    archivo: UploadFile = File(...),
    dry_run: bool = Form(True),
    limite: int = Form(0),  # 0 = sin límite (manda todo lo pendiente)
):
    """Envía (o simula) la encuesta a las filas enviables del Excel (en tandas)."""
    from .services.encuestas_masivo import enviar, parsear_excel

    filas = parsear_excel(await archivo.read())
    return enviar(filas, dry_run=dry_run, limite=(limite or None))


@app.get("/encuestas/horario", dependencies=[Depends(requiere_clave)])
def encuestas_horario() -> dict:
    """Indica si estamos dentro del horario de envío de encuestas."""
    from .services.encuestas_masivo import en_horario

    return en_horario()


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


@app.get("/media", dependencies=[Depends(requiere_clave)])
def media_proxy(url: str) -> Response:
    """Sirve un audio/imagen de Twilio (que pide autenticación) para escucharlo en el panel.

    Twilio protege las URLs de media con la cuenta; este proxy las trae con las
    credenciales y las devuelve para que el reproductor del panel funcione.
    Sólo permite URLs de twilio.com (evita que se use para traer cualquier cosa).
    """
    from urllib.parse import urlparse

    import requests

    host = (urlparse(url).hostname or "").lower()
    if not (host == "api.twilio.com" or host.endswith(".twilio.com")):
        raise HTTPException(status_code=400, detail="URL no permitida.")
    config = obtener_config()
    try:
        r = requests.get(
            url, auth=(config.twilio_account_sid, config.twilio_auth_token), timeout=20
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"No se pudo traer el media: {exc}") from exc
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Twilio devolvió {r.status_code}.")
    return Response(content=r.content, media_type=r.headers.get("Content-Type", "application/octet-stream"))


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


# ── Simulador: probar el bot sin enviar WhatsApp real ────────────────────────
# Cliente ficticio y número real de Pedro Corradi (para que rutee a esa marca).
_SIM_NUMERO = "+5492804001765"
_SIM_TELEFONO = "+5491100000000"


def _mensajes_de_twiml(twiml: str) -> list[str]:
    """Extrae el/los texto(s) de un TwiML <Message>…</Message>."""
    partes = re.findall(r"<Message>(.*?)</Message>", twiml, re.S)
    if not partes:  # por las dudas: sacamos cualquier tag y devolvemos el texto
        partes = [re.sub(r"<[^>]+>", "", twiml)]
    return [html.unescape(p).strip() for p in partes if p.strip()]


def _registrar_conversacion(
    numero: str, telefono: str, body: str, twiml: str | None, es_media: bool = False
) -> None:
    """Guarda el mensaje del cliente y la respuesta del bot en el historial.

    Centraliza el log de TODA conversación (no solo las de IA) para el buzón de
    Conversaciones y la memoria. Best-effort: nunca rompe el webhook.
    """
    try:
        from .persistencia import obtener_repo

        repo = obtener_repo()
        entrante = (body or "").strip()
        if not entrante and es_media:
            entrante = "🎤 (mensaje multimedia)"
        if entrante:
            repo.agregar_historial(numero, telefono, "user", entrante)
        if twiml:
            for m in _mensajes_de_twiml(twiml):
                repo.agregar_historial(numero, telefono, "assistant", m)
    except Exception as exc:  # noqa: BLE001
        print(f"⚠️  [HISTORIAL] No se pudo registrar la conversación: {exc}")


@app.post("/simular", dependencies=[Depends(requiere_clave)])
async def simular(request: Request) -> dict:
    """Corre el bot para un cliente ficticio y devuelve la respuesta (sin enviar nada)."""
    datos = await request.json()
    numero = normalizar_telefono(datos.get("numero") or _SIM_NUMERO)
    telefono = normalizar_telefono(datos.get("telefono") or _SIM_TELEFONO)
    cuenta = buscar_cuenta(numero)
    if cuenta is None:
        return {"respuestas": [f"(el número {numero} no está registrado)"]}
    texto_in = str(datos.get("texto", ""))
    twiml = decidir_respuesta(cuenta, texto_in, telefono, numero, simular=True)
    _registrar_conversacion(numero, telefono, texto_in, twiml)  # memoria del simulador
    if twiml is None:
        return {
            "respuestas": ["⏸️ (el bot quedó en pausa — derivado a un asesor humano)"],
            "pausado": True,
        }
    return {"respuestas": _mensajes_de_twiml(twiml)}


@app.post("/simular/encuesta", dependencies=[Depends(requiere_clave)])
async def simular_encuesta(request: Request) -> dict:
    """Inicia una encuesta de prueba (taller/ventas) para el cliente ficticio."""
    from .services.integracion import recibir_evento

    datos = await request.json()
    telefono = datos.get("telefono") or _SIM_TELEFONO
    # Sin id_externo → no se hace writeback al sistema interno (es una simulación).
    evento = {
        "tipo": str(datos.get("tipo", "servicio")),
        "cliente": "Cliente de prueba",
        "telefono": telefono,
        "referencia": str(datos.get("referencia", "Ford Ranger")),
        "empresa": "empresa_pedro_corradi",
    }
    res = recibir_evento(evento, dry_run=True)
    return {"respuestas": [res.get("vista_previa", "(no se pudo iniciar)")], "estado": res.get("estado")}


@app.post("/simular/reiniciar", dependencies=[Depends(requiere_clave)])
async def simular_reiniciar(request: Request) -> dict:
    """Borra el estado del chat de prueba (sesión, encuesta, memoria, pausa)."""
    from .persistencia import obtener_repo

    datos = await request.json()
    numero = normalizar_telefono(datos.get("numero") or _SIM_NUMERO)
    telefono = normalizar_telefono(datos.get("telefono") or _SIM_TELEFONO)
    obtener_repo().reiniciar_conversacion(numero, telefono)
    return {"ok": True}


@app.get("/media", dependencies=[Depends(requiere_clave)])
def media_proxy(url: str) -> Response:
    """Sirve un audio/imagen de Twilio (requiere autenticación) para oírlo en el panel."""
    import requests as _requests
    from urllib.parse import urlparse

    host = (urlparse(url).hostname or "").lower()
    if not (host == "api.twilio.com" or host.endswith(".twilio.com")):
        raise HTTPException(status_code=400, detail="URL no permitida.")
    config = obtener_config()
    try:
        r = _requests.get(
            url, auth=(config.twilio_account_sid, config.twilio_auth_token), timeout=25
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"No se pudo obtener el medio: {exc}") from exc
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Twilio respondió {r.status_code}.")
    return Response(
        content=r.content,
        media_type=r.headers.get("Content-Type", "application/octet-stream"),
    )


# ── Conversaciones: buzón del equipo (ver chats, derivar por área, responder) ─
@app.get("/conversaciones", dependencies=[Depends(requiere_clave)])
def listar_conversaciones_ep(area: str = "") -> dict:
    """Lista los chats del número, con su área y si el bot está en pausa (pidió asesor)."""
    from .persistencia import obtener_repo

    repo = obtener_repo()
    numero = normalizar_telefono(_SIM_NUMERO)
    sim_tel = normalizar_telefono(_SIM_TELEFONO)
    convs = [c for c in repo.listar_conversaciones(numero) if c["telefono"] != sim_tel]
    for c in convs:
        c["pausado"] = repo.bot_pausado(c["telefono"])
        c["area"] = repo.area_de(numero, c["telefono"]) or "Sin asignar"
    areas = sorted({c["area"] for c in convs})
    if area:
        convs = [c for c in convs if c["area"] == area]
    convs.sort(key=lambda c: 0 if c.get("pausado") else 1)  # los que piden asesor, primero
    return {"conversaciones": convs, "areas": areas}


@app.get("/conversaciones/{telefono}", dependencies=[Depends(requiere_clave)])
def ver_conversacion_ep(telefono: str) -> dict:
    """Devuelve el historial de un chat + su área + si está en pausa."""
    from .persistencia import obtener_repo

    repo = obtener_repo()
    numero = normalizar_telefono(_SIM_NUMERO)
    tel = normalizar_telefono(telefono)
    return {
        "telefono": tel,
        "mensajes": repo.historial(numero, tel),
        "pausado": repo.bot_pausado(tel),
        "area": repo.area_de(numero, tel) or "Sin asignar",
    }


@app.post("/conversaciones/{telefono}/responder", dependencies=[Depends(requiere_clave)])
async def responder_conversacion_ep(telefono: str, request: Request) -> dict:
    """Un asesor responde al cliente desde el panel (y el bot queda en pausa)."""
    from .persistencia import obtener_repo
    from .services.twilio_client import enviar_mensaje

    datos = await request.json()
    texto = str(datos.get("texto", "")).strip()
    if not texto:
        raise HTTPException(status_code=400, detail="Mensaje vacío.")
    repo = obtener_repo()
    numero = normalizar_telefono(_SIM_NUMERO)
    tel = normalizar_telefono(telefono)
    try:
        sid = enviar_mensaje(tel, numero, texto)
    except Exception as exc:  # noqa: BLE001
        return {
            "estado": "error",
            "detalle": (
                f"No se pudo enviar: {exc}. Si pasaron más de 24 hs desde el último "
                "mensaje del cliente, WhatsApp no permite responder en texto libre."
            ),
        }
    repo.agregar_historial(numero, tel, "assistant", texto)
    repo.pausar_bot(tel)  # el asesor toma la conversación
    return {"estado": "enviado", "sid": sid}


@app.post("/conversaciones/{telefono}/reactivar", dependencies=[Depends(requiere_clave)])
async def reactivar_conversacion_ep(telefono: str) -> dict:
    """Devuelve la conversación al bot (lo reactiva)."""
    from .persistencia import obtener_repo

    obtener_repo().reactivar_bot(normalizar_telefono(telefono))
    return {"ok": True}


@app.post("/conversaciones/{telefono}/derivar", dependencies=[Depends(requiere_clave)])
async def derivar_conversacion_ep(telefono: str, request: Request) -> dict:
    """Asigna/deriva la conversación a un área (Ventas, Taller, Repuestos, Planes...)."""
    from .persistencia import obtener_repo

    datos = await request.json()
    area = str(datos.get("area", "")).strip()
    if not area:
        raise HTTPException(status_code=400, detail="Falta el área.")
    obtener_repo().fijar_area(
        normalizar_telefono(_SIM_NUMERO), normalizar_telefono(telefono), area
    )
    return {"ok": True, "area": area}


@app.post("/conversaciones/{telefono}/resumen", dependencies=[Depends(requiere_clave)])
def resumen_conversacion_ep(telefono: str) -> dict:
    """Genera un resumen del chat (con IA) para pasarle el caso a un asesor."""
    from .persistencia import obtener_repo

    repo = obtener_repo()
    numero = normalizar_telefono(_SIM_NUMERO)
    tel = normalizar_telefono(telefono)
    mensajes = repo.historial(numero, tel)
    area = repo.area_de(numero, tel) or ""
    return {"telefono": tel, "area": area, "resumen": _resumir_conversacion(mensajes, tel, area)}


def _resumir_conversacion(mensajes: list[dict], telefono: str, area: str) -> str:
    """Resumen breve de la conversación para el asesor (IA si está activa; si no, fallback)."""
    transcripcion = "\n".join(
        f"{'Cliente' if m.get('role') == 'user' else 'Pedro Corradi'}: {m.get('content', '')}"
        for m in mensajes
    )
    config = obtener_config()
    if config.ia_activa and config.anthropic_api_key and transcripcion.strip():
        try:
            from anthropic import Anthropic

            cliente = Anthropic(api_key=config.anthropic_api_key)
            r = cliente.messages.create(
                model=config.ia_modelo.strip().lower(),
                max_tokens=350,
                system=(
                    "Resumís conversaciones de WhatsApp de una concesionaria Ford para "
                    "pasarle el caso a un asesor que NO leyó el chat. Devolvé un resumen "
                    "BREVE en viñetas: qué necesita el cliente, datos clave (modelo de "
                    "interés, usado en parte de pago, forma de pago/presupuesto, urgencia) "
                    "y qué acción concreta se requiere. Claro y al grano, sin saludos."
                ),
                messages=[{
                    "role": "user",
                    "content": f"Área: {area}\nCliente: {telefono}\n\nConversación:\n{transcripcion}",
                }],
            )
            for bloque in r.content:
                if bloque.type == "text":
                    return bloque.text.strip()
        except Exception as exc:  # noqa: BLE001
            print(f"⚠️  [RESUMEN] {exc}")
    # Fallback sin IA: devolvemos la transcripción (recortada).
    return "(Resumen automático no disponible.) Conversación:\n" + transcripcion[-800:]


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
