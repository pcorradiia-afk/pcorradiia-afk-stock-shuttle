"""Envío saliente de campañas masivas con plantilla aprobada y rate limiting.

Caso de uso #1: notificaciones críticas de Planes de Ahorro (adjudicaciones,
licitaciones, alertas de cuotas). El flujo, por cada destinatario:

  1) Normaliza el teléfono a +549... (E.164).
  2) Verifica rate limiting: no reenviar la misma campaña al mismo número en
     24 hs, de forma independiente por empresa.
  3) Arma las variables de la plantilla ({{1}}, {{2}}, ...) desde los datos.
  4) Envía la plantilla por Twilio — o SIMULA si está en dry-run o faltan
     credenciales (modo seguro por defecto).
  5) Registra el envío para el rate limiting.

Devuelve un `ReporteCampania` con el detalle de qué pasó con cada número.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from ..config import obtener_config
from ..core import rate_limit
from ..core.normalizacion import normalizar_telefono
from ..marcas import LINEA_PLANES, buscar_por_empresa
from .twilio_client import enviar_plantilla

# Carpeta raíz de datos simulados: whatsapp/data/<id_empresa>/...
_DIR_DATOS = Path(__file__).resolve().parents[2] / "data"


class CampaniaError(Exception):
    """Error de configuración de campaña (empresa/plantilla/archivo inexistente)."""


@dataclass
class ResultadoEnvio:
    """Qué pasó con un destinatario puntual."""

    telefono: str
    estado: str            # "enviado" | "simulado" | "duplicado" | "error"
    detalle: str = ""


@dataclass
class ReporteCampania:
    """Resumen del envío completo."""

    id_empresa: str
    linea: str
    plantilla: str
    numero_origen: str
    modo: str              # "real" | "simulado"
    total: int = 0
    enviados: int = 0
    simulados: int = 0
    duplicados: int = 0
    errores: int = 0
    resultados: list[ResultadoEnvio] = field(default_factory=list)


def correr_campania(
    id_empresa: str,
    linea: str,
    plantilla_logica: str,
    archivo: str,
    campos: list[str],
    dry_run: bool = True,
) -> ReporteCampania:
    """Ejecuta una campaña genérica con plantilla aprobada y rate limiting.

    - `plantilla_logica`: nombre lógico en `ConfigLinea.plantillas` (p. ej.
      "adjudicacion_plan") que se resuelve al `content_sid` (HX...) real.
    - `archivo`: JSON en `data/<id_empresa>/` con la lista de destinatarios.
    - `campos`: nombres de campo en orden de la plantilla → {{1}}, {{2}}, ...
    - `dry_run`: si True (o si faltan credenciales), no llama a Twilio; simula.
    """
    encontrado = buscar_por_empresa(id_empresa, linea)
    if encontrado is None:
        raise CampaniaError(
            f"No hay una cuenta para empresa '{id_empresa}' en la línea '{linea}'."
        )
    numero_origen, ctx = encontrado

    content_sid = ctx.plantillas.get(plantilla_logica)
    if not content_sid:
        raise CampaniaError(
            f"La línea {ctx.etiqueta_linea} de {ctx.empresa} no tiene configurada "
            f"la plantilla '{plantilla_logica}'."
        )

    destinatarios = _cargar_datos(id_empresa, archivo)

    config = obtener_config()
    usar_twilio = (not dry_run) and bool(
        config.twilio_account_sid and config.twilio_auth_token
    )
    reporte = ReporteCampania(
        id_empresa=id_empresa,
        linea=linea,
        plantilla=plantilla_logica,
        numero_origen=numero_origen,
        modo="real" if usar_twilio else "simulado",
        total=len(destinatarios),
    )

    print("\n" + "=" * 64)
    print(f"📣 [CAMPAÑA] {plantilla_logica} · {ctx.empresa} · {ctx.etiqueta_linea}")
    print(f"   Desde   : {numero_origen}   Plantilla: {content_sid}")
    print(f"   Modo    : {reporte.modo}   Destinatarios: {reporte.total}")
    print("=" * 64)

    for dato in destinatarios:
        telefono = normalizar_telefono(dato.get("telefono"))

        if not telefono:
            reporte.errores += 1
            reporte.resultados.append(
                ResultadoEnvio(telefono="?", estado="error", detalle="teléfono inválido")
            )
            continue

        # Rate limiting: 1 envío de esta campaña por número cada 24 hs por empresa.
        if rate_limit.ya_enviado(id_empresa, plantilla_logica, telefono):
            reporte.duplicados += 1
            reporte.resultados.append(
                ResultadoEnvio(telefono, "duplicado", "ya notificado en las últimas 24 hs")
            )
            print(f"   ⏭️  {telefono} · duplicado (omitido)")
            continue

        variables = {str(i + 1): str(dato.get(campo, "")) for i, campo in enumerate(campos)}

        try:
            if usar_twilio:
                sid = enviar_plantilla(telefono, numero_origen, content_sid, variables)
                reporte.enviados += 1
                reporte.resultados.append(ResultadoEnvio(telefono, "enviado", sid))
                print(f"   ✅ {telefono} · enviado ({sid})")
            else:
                reporte.simulados += 1
                detalle = "dry-run" if dry_run else "faltan credenciales Twilio"
                reporte.resultados.append(ResultadoEnvio(telefono, "simulado", detalle))
                print(f"   🧪 {telefono} · simulado → variables={variables}")
            # Registramos el envío (real o simulado) para el rate limiting.
            rate_limit.registrar_envio(id_empresa, plantilla_logica, telefono)
        except Exception as exc:  # noqa: BLE001 — reportamos el error sin frenar la campaña
            reporte.errores += 1
            reporte.resultados.append(ResultadoEnvio(telefono, "error", str(exc)))
            print(f"   ❌ {telefono} · error: {exc}")

    print(
        f"   Resumen: enviados={reporte.enviados} simulados={reporte.simulados} "
        f"duplicados={reporte.duplicados} errores={reporte.errores}"
    )
    return reporte


# --- Atajo para la campaña concreta de adjudicaciones de planes ---
PLANTILLA_ADJUDICACION = "adjudicacion_plan"


def correr_adjudicaciones(id_empresa: str, dry_run: bool = True) -> ReporteCampania:
    """Campaña de adjudicaciones de Planes de Ahorro para una empresa.

    Lee `data/<id_empresa>/adjudicaciones.json` y mapea los campos al orden de la
    plantilla: {{1}}=nombre, {{2}}=modelo, {{3}}=fecha del acto.
    """
    return correr_campania(
        id_empresa=id_empresa,
        linea=LINEA_PLANES,
        plantilla_logica=PLANTILLA_ADJUDICACION,
        archivo="adjudicaciones.json",
        campos=["nombre", "modelo", "fecha_acto"],
        dry_run=dry_run,
    )


def _cargar_datos(id_empresa: str, archivo: str) -> list[dict]:
    """Carga la lista de destinatarios desde data/<id_empresa>/<archivo>."""
    ruta = _DIR_DATOS / id_empresa / archivo
    if not ruta.exists():
        raise CampaniaError(f"No se encontró el archivo de datos: {ruta}")
    with ruta.open(encoding="utf-8") as f:
        datos = json.load(f)
    if not isinstance(datos, list):
        raise CampaniaError(f"El archivo {ruta} debe contener una lista de destinatarios.")
    return datos
