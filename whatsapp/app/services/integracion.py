"""Integración con el sistema interno (in-house) del concesionario.

Dos piezas, pensadas para que el sistema interno siga siendo "el cerebro"
(datos, reglas, alertas) y este motor sea sólo "el brazo de WhatsApp":

  1) ENTRADA  — `recibir_evento`: el sistema interno nos avisa (POST /eventos)
     que hay que encuestar a un cliente (una OR de servicio, una entrega de
     ventas, repuestos, etc.). Mandamos la encuesta por WhatsApp y dejamos la
     conversación "abierta" etiquetada con `id_externo` (la OR).

  2) SALIDA   — `enviar_writeback`: cuando el cliente termina de responder por
     WhatsApp, devolvemos el resultado al sistema interno (a `WRITEBACK_URL`)
     para que complete la OR y, si corresponde, dispare su alerta de RQR.

El formato del evento es genérico (sirve para servicio, ventas, repuestos,
entregas…): cambia sólo el campo `tipo`.
"""

from __future__ import annotations

import requests

from ..config import obtener_config
from ..core.normalizacion import normalizar_telefono
from ..marcas import LINEA_POSVENTA, LINEA_VENTAS, buscar_por_empresa
from ..persistencia import obtener_repo
from . import encuestas, sesion
from .twilio_client import enviar_plantilla

# Mapa: tipo de evento del sistema interno → (tipo de encuesta, línea del bot).
_MAPA_TIPO: dict[str, tuple[str, str]] = {
    "servicio": ("taller", LINEA_POSVENTA),
    "taller": ("taller", LINEA_POSVENTA),
    "repuestos": ("taller", LINEA_POSVENTA),
    "garantia": ("taller", LINEA_POSVENTA),
    "ventas": ("ventas", LINEA_VENTAS),
    "entrega": ("ventas", LINEA_VENTAS),
    "0km": ("ventas", LINEA_VENTAS),
}
_EMPRESA_DEFECTO = "empresa_pedro_corradi"


def recibir_evento(evento: dict, dry_run: bool | None = None) -> dict:
    """Procesa un evento del sistema interno: manda la encuesta por WhatsApp.

    `evento` espera (mínimo): telefono. Y opcional/recomendado: tipo, cliente,
    referencia, id_externo (la OR), sucursal, empresa.

    Devuelve un dict con el estado del envío (enviada | simulada | error).
    """
    tipo_in = str(evento.get("tipo") or "servicio").lower()
    tipo_encuesta, linea = _MAPA_TIPO.get(tipo_in, ("taller", LINEA_POSVENTA))
    id_empresa = evento.get("empresa") or _EMPRESA_DEFECTO

    telefono = normalizar_telefono(evento.get("telefono"))
    if not telefono:
        return {"estado": "error", "detalle": "teléfono inválido o ausente"}

    encontrado = buscar_por_empresa(id_empresa, linea)
    if encontrado is None:
        return {
            "estado": "error",
            "detalle": f"No hay '{linea}' configurada para la empresa '{id_empresa}'.",
        }
    numero_origen, ctx = encontrado

    config = obtener_config()
    if dry_run is None:
        dry_run = config.encuestas_dry_run
    usar_twilio = (not dry_run) and bool(
        config.twilio_account_sid and config.twilio_auth_token
    )

    nombre = evento.get("cliente", "")
    referencia = evento.get("referencia", "")
    preview = encuestas._texto_intro(id_empresa, tipo_encuesta).format_map(
        encuestas._DefaultDict(
            {"nombre": nombre, "empresa": ctx.saludo, "referencia": referencia}
        )
    )

    estado, detalle = "simulada", "dry-run"
    plantilla = ctx.plantillas.get(encuestas.PLANTILLA_ENCUESTA)
    if usar_twilio and plantilla is not None:
        try:
            detalle = enviar_plantilla(
                telefono, numero_origen, plantilla.sid,
                {"1": str(nombre), "2": str(referencia)},
            )
            estado = "enviada"
        except Exception as exc:  # noqa: BLE001
            return {"estado": "error", "detalle": str(exc)}

    # Abrimos la encuesta etiquetada con la OR (id_externo) para el writeback.
    repo = obtener_repo()
    repo.abrir_encuesta(
        numero_origen,
        telefono,
        {
            "id_empresa": id_empresa,
            "tipo": tipo_encuesta,
            "referencia": referencia,
            "nombre": nombre,
            "paso": 0,
            "respuestas": {},
            "id_externo": evento.get("id_externo", ""),
            "sucursal": evento.get("sucursal", ""),
        },
    )
    sesion.elegir_linea(numero_origen, telefono, linea)

    print(
        f"📥 [EVENTO] {tipo_in} · OR {evento.get('id_externo', '?')} · {telefono} "
        f"→ encuesta {estado}"
    )
    return {
        "estado": estado,
        "detalle": detalle,
        "numero_origen": numero_origen,
        "telefono": telefono,
        "vista_previa": preview,
    }


def enviar_writeback(
    contexto: dict, telefono: str, respuestas: dict, comentario: str = ""
) -> None:
    """Devuelve el resultado de la encuesta al sistema interno (best-effort).

    No rompe el flujo si falla (la respuesta ya quedó guardada localmente). Sólo
    actúa si hay `WRITEBACK_URL` configurada y el evento traía `id_externo`.
    """
    config = obtener_config()
    id_externo = contexto.get("id_externo")
    if not config.writeback_url or not id_externo:
        return

    payload = {
        "id_externo": id_externo,
        "tipo": contexto.get("tipo"),
        "sucursal": contexto.get("sucursal"),
        "telefono": telefono,
        "puntajes": respuestas,
        "recomienda": recomienda(respuestas),
        "clasificacion": clasificacion(respuestas),
        "comentario": comentario,
    }
    headers = {"Content-Type": "application/json"}
    if config.writeback_token:
        headers["Authorization"] = f"Bearer {config.writeback_token}"

    try:
        resp = requests.post(
            config.writeback_url, json=payload, headers=headers, timeout=10
        )
        print(f"📤 [WRITEBACK] OR {id_externo} → {config.writeback_url} ({resp.status_code})")
    except Exception as exc:  # noqa: BLE001
        print(f"⚠️  [WRITEBACK] No se pudo enviar la OR {id_externo}: {exc}")


def recomienda(respuestas: dict) -> bool | None:
    """Sí/No de recomendación a partir del puntaje (>=3 = recomienda). None si no aplica."""
    if "recomendacion" not in respuestas:
        return None
    return int(respuestas["recomendacion"]) >= 3


def clasificacion(respuestas: dict) -> str:
    """Clasifica como en el sistema interno: Felicitacion | Registrar | RQR."""
    valores = [int(v) for v in respuestas.values()]
    if not valores:
        return "Registrar"
    if any(v <= 2 for v in valores) or recomienda(respuestas) is False:
        return "RQR"
    if any(v == 3 for v in valores):
        return "Registrar"
    return "Felicitacion"
