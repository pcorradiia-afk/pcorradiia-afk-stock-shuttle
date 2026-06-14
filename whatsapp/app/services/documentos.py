"""Envío de multimedia: cupones de pago en PDF y contratos por URL pública.

Dos modos, según la regla de las 24 hs de WhatsApp:

  1) CAMPAÑA de cupones (`correr_cupones`): INICIA conversación, así que va con
     plantilla aprobada que lleva el PDF en el encabezado. El documento es la
     variable {{1}}; {{2}}=nombre, {{3}}=período. Aplica rate limiting.

  2) ENVÍO INDIVIDUAL (`enviar_documento`): para mandar un contrato/archivo a un
     cliente que YA está en conversación (dentro de las 24 hs). Usa multimedia
     libre (texto + URL del archivo), sin plantilla.

Los documentos viven en URLs públicas (las genera el sistema de pagos/contratos
del grupo); acá sólo se referencian. Modo simulación (`dry_run`) por defecto.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from ..config import obtener_config
from ..core import rate_limit
from ..core.normalizacion import normalizar_telefono
from ..marcas import LINEA_PLANES, buscar_por_empresa
from .twilio_client import enviar_medios, enviar_plantilla

_DIR_DATOS = Path(__file__).resolve().parents[2] / "data"

PLANTILLA_CUPON = "cupon_pago"


class DocumentoError(Exception):
    """Error de configuración (empresa/plantilla/archivo inexistente)."""


@dataclass
class ResultadoDocumento:
    telefono: str
    estado: str            # "enviado" | "simulado" | "duplicado" | "error"
    detalle: str = ""
    url: str = ""


@dataclass
class ReporteDocumentos:
    id_empresa: str
    tipo: str              # "cupon_pago"
    numero_origen: str
    modo: str              # "real" | "simulado"
    total: int = 0
    enviados: int = 0
    simulados: int = 0
    duplicados: int = 0
    errores: int = 0
    resultados: list[ResultadoDocumento] = field(default_factory=list)


def correr_cupones(id_empresa: str, dry_run: bool = True) -> ReporteDocumentos:
    """Campaña de cupones de pago en PDF (caso #4) para los planes de una empresa.

    Lee `data/<id_empresa>/cupones.json` y manda, por plantilla aprobada, el PDF
    del cupón a cada cliente. Variables: {{1}}=URL del PDF, {{2}}=nombre,
    {{3}}=período.
    """
    encontrado = buscar_por_empresa(id_empresa, LINEA_PLANES)
    if encontrado is None:
        raise DocumentoError(f"La empresa '{id_empresa}' no tiene línea de Planes.")
    numero_origen, ctx = encontrado

    plantilla = ctx.plantillas.get(PLANTILLA_CUPON)
    if plantilla is None:
        raise DocumentoError(
            f"Los Planes de {ctx.empresa} no tienen la plantilla '{PLANTILLA_CUPON}'."
        )

    cupones = _cargar_datos(id_empresa, "cupones.json")

    config = obtener_config()
    usar_twilio = (not dry_run) and bool(
        config.twilio_account_sid and config.twilio_auth_token
    )
    reporte = ReporteDocumentos(
        id_empresa=id_empresa,
        tipo=PLANTILLA_CUPON,
        numero_origen=numero_origen,
        modo="real" if usar_twilio else "simulado",
        total=len(cupones),
    )

    print("\n" + "=" * 64)
    print(f"🧾 [CUPONES] {ctx.empresa} · Planes   Modo: {reporte.modo}")
    print("=" * 64)

    for cupon in cupones:
        telefono = normalizar_telefono(cupon.get("telefono"))
        url = cupon.get("url", "")

        if not telefono or not url:
            reporte.errores += 1
            reporte.resultados.append(
                ResultadoDocumento(telefono or "?", "error", "falta teléfono o URL")
            )
            continue

        if rate_limit.ya_enviado(id_empresa, PLANTILLA_CUPON, telefono):
            reporte.duplicados += 1
            reporte.resultados.append(
                ResultadoDocumento(telefono, "duplicado", "ya enviado en las últimas 24 hs", url)
            )
            print(f"   ⏭️  {telefono} · duplicado (omitido)")
            continue

        # {{1}}=URL del documento, {{2}}=nombre, {{3}}=período.
        variables = {
            "1": url,
            "2": str(cupon.get("nombre", "")),
            "3": str(cupon.get("periodo", "")),
        }

        try:
            if usar_twilio:
                sid = enviar_plantilla(telefono, numero_origen, plantilla.sid, variables)
                reporte.enviados += 1
                reporte.resultados.append(ResultadoDocumento(telefono, "enviado", sid, url))
                print(f"   ✅ {telefono} · enviado ({sid})")
            else:
                reporte.simulados += 1
                reporte.resultados.append(ResultadoDocumento(telefono, "simulado", "dry-run", url))
                print(f"   🧪 {telefono} · simulado → PDF: {url}")
            rate_limit.registrar_envio(id_empresa, PLANTILLA_CUPON, telefono)
        except Exception as exc:  # noqa: BLE001
            reporte.errores += 1
            reporte.resultados.append(ResultadoDocumento(telefono, "error", str(exc), url))
            print(f"   ❌ {telefono} · error: {exc}")

    print(
        f"   Resumen: enviados={reporte.enviados} simulados={reporte.simulados} "
        f"duplicados={reporte.duplicados} errores={reporte.errores}"
    )
    return reporte


def enviar_documento(
    id_empresa: str,
    linea: str,
    telefono: str,
    url: str,
    cuerpo: str,
    dry_run: bool = True,
) -> ResultadoDocumento:
    """Envía un documento (contrato, PDF) a un cliente que ya está en conversación.

    Multimedia libre (texto + archivo), válido dentro de la ventana de 24 hs. Para
    iniciar conversación con un documento, usá una plantilla (como los cupones).
    """
    encontrado = buscar_por_empresa(id_empresa, linea)
    if encontrado is None:
        raise DocumentoError(
            f"No hay una cuenta para empresa '{id_empresa}' en la línea '{linea}'."
        )
    numero_origen, _ctx = encontrado

    destino = normalizar_telefono(telefono)
    if not destino or not url:
        return ResultadoDocumento(destino or "?", "error", "falta teléfono o URL", url)

    config = obtener_config()
    usar_twilio = (not dry_run) and bool(
        config.twilio_account_sid and config.twilio_auth_token
    )

    try:
        if usar_twilio:
            sid = enviar_medios(destino, numero_origen, cuerpo, [url])
            print(f"📄 [DOCUMENTO] {destino} · enviado ({sid}) → {url}")
            return ResultadoDocumento(destino, "enviado", sid, url)
        print(f"📄 [DOCUMENTO] {destino} · simulado → {url}\n        texto: {cuerpo}")
        return ResultadoDocumento(destino, "simulado", "dry-run", url)
    except Exception as exc:  # noqa: BLE001
        return ResultadoDocumento(destino, "error", str(exc), url)


def _cargar_datos(id_empresa: str, archivo: str) -> list[dict]:
    ruta = _DIR_DATOS / id_empresa / archivo
    if not ruta.exists():
        raise DocumentoError(f"No se encontró el archivo de datos: {ruta}")
    with ruta.open(encoding="utf-8") as f:
        datos = json.load(f)
    if not isinstance(datos, list):
        raise DocumentoError(f"El archivo {ruta} debe contener una lista.")
    return datos
