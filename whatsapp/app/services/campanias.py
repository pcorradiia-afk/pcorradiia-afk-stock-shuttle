"""Envío saliente de campañas masivas con plantilla aprobada y rate limiting.

Cubre dos casos de uso:
  #1 Planes de Ahorro  → adjudicaciones (texto).
  #2 Fidelización      → difusión de stock (texto + IMAGEN + BOTONES de respuesta).

Regla de WhatsApp: una campaña INICIA la conversación, así que debe usar una
plantilla aprobada (HSM). La imagen del encabezado y los botones de respuesta
rápida son parte de esa plantilla; nuestro código elige la plantilla correcta
por marca/línea y la completa con los datos (nombre, modelo, URL de imagen...).

Flujo por destinatario:
  1) Normaliza el teléfono a +549...
  2) Rate limiting: no reenviar la misma campaña al mismo número en 24 hs (por empresa).
  3) Arma las variables de la plantilla ({{1}}, {{2}}, ...), incluyendo la imagen.
  4) Envía por Twilio — o SIMULA (dry-run / sin credenciales): modo seguro.
  5) Registra el envío para el rate limiting.

Cuando el cliente toca un botón, su respuesta vuelve por el /webhook y la maneja
el enrutador (p. ej. "Hablar con asesor" dispara la derivación humana).
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from ..config import obtener_config
from ..core import rate_limit
from ..core.normalizacion import normalizar_telefono
from ..marcas import LINEA_PLANES, LINEA_VENTAS, buscar_por_empresa
from . import sesion
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
    vista_previa: str = ""  # cómo se vería el mensaje (solo informativo en simulación)


@dataclass
class ReporteCampania:
    """Resumen del envío completo."""

    id_empresa: str
    linea: str
    plantilla: str
    numero_origen: str
    modo: str              # "real" | "simulado"
    con_imagen: bool = False
    opciones: list[str] = field(default_factory=list)
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
    cuerpo_preview: str = "",
    imagen_url: str | None = None,
    imagen_campo: str | None = None,
    dry_run: bool = True,
) -> ReporteCampania:
    """Ejecuta una campaña con plantilla aprobada, imagen opcional y rate limiting.

    - `plantilla_logica`: nombre en `ConfigLinea.plantillas` (ej. "difusion_stock").
    - `archivo`: JSON en `data/<id_empresa>/` con la lista de destinatarios.
    - `campos`: campos del dato en orden de las variables de texto de la plantilla.
    - `cuerpo_preview`: texto con placeholders {campo} para mostrar en la simulación
      cómo se vería el mensaje (en el envío real el texto lo define la plantilla).
    - `imagen_url` / `imagen_campo`: imagen del encabezado, global o por destinatario.
    - `dry_run`: si True (o faltan credenciales), no llama a Twilio; simula.
    """
    encontrado = buscar_por_empresa(id_empresa, linea)
    if encontrado is None:
        raise CampaniaError(
            f"No hay una cuenta para empresa '{id_empresa}' en la línea '{linea}'."
        )
    numero_origen, ctx = encontrado

    plantilla = ctx.plantillas.get(plantilla_logica)
    if plantilla is None:
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
        con_imagen=plantilla.tiene_imagen,
        opciones=list(plantilla.opciones),
        total=len(destinatarios),
    )

    print("\n" + "=" * 64)
    print(f"📣 [CAMPAÑA] {plantilla_logica} · {ctx.empresa} · {ctx.etiqueta_linea}")
    print(f"   Desde   : {numero_origen}   Plantilla: {plantilla.sid}")
    print(f"   Modo    : {reporte.modo}   Destinatarios: {reporte.total}")
    if plantilla.tiene_imagen:
        print("   Incluye : 🖼️  imagen en el encabezado")
    if plantilla.opciones:
        print(f"   Botones : {' | '.join(plantilla.opciones)}")
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

        # Resolver imagen (por destinatario o global) y armar las variables.
        imagen = (dato.get(imagen_campo) if imagen_campo else imagen_url) or None
        variables = _armar_variables(campos, dato, imagen if plantilla.tiene_imagen else None)
        preview = _render(cuerpo_preview, dato)

        try:
            if usar_twilio:
                sid = enviar_plantilla(telefono, numero_origen, plantilla.sid, variables)
                reporte.enviados += 1
                reporte.resultados.append(ResultadoEnvio(telefono, "enviado", sid, preview))
                print(f"   ✅ {telefono} · enviado ({sid})")
            else:
                reporte.simulados += 1
                detalle = "dry-run" if dry_run else "faltan credenciales Twilio"
                reporte.resultados.append(ResultadoEnvio(telefono, "simulado", detalle, preview))
                print(f"   🧪 {telefono} · simulado")
                if preview:
                    print(f"        texto : {preview}")
                if imagen and plantilla.tiene_imagen:
                    print(f"        imagen: {imagen}")
                if plantilla.opciones:
                    print(f"        botones: {' | '.join(plantilla.opciones)}")
            # Registramos el envío (real o simulado) para el rate limiting.
            rate_limit.registrar_envio(id_empresa, plantilla_logica, telefono)
            # "Cebamos" la línea: la respuesta del cliente (tocar un botón) caerá
            # en el contexto de esta campaña sin volver a preguntarle la línea.
            sesion.elegir_linea(numero_origen, telefono, linea)
        except Exception as exc:  # noqa: BLE001 — reportamos el error sin frenar la campaña
            reporte.errores += 1
            reporte.resultados.append(ResultadoEnvio(telefono, "error", str(exc)))
            print(f"   ❌ {telefono} · error: {exc}")

    print(
        f"   Resumen: enviados={reporte.enviados} simulados={reporte.simulados} "
        f"duplicados={reporte.duplicados} errores={reporte.errores}"
    )
    return reporte


# --- Atajos para las campañas concretas ---
PLANTILLA_ADJUDICACION = "adjudicacion_plan"
PLANTILLA_DIFUSION = "difusion_stock"


def correr_adjudicaciones(id_empresa: str, dry_run: bool = True) -> ReporteCampania:
    """Campaña de adjudicaciones de Planes de Ahorro (texto).

    {{1}}=nombre, {{2}}=modelo, {{3}}=fecha del acto.
    """
    return correr_campania(
        id_empresa=id_empresa,
        linea=LINEA_PLANES,
        plantilla_logica=PLANTILLA_ADJUDICACION,
        archivo="adjudicaciones.json",
        campos=["nombre", "modelo", "fecha_acto"],
        cuerpo_preview=(
            "¡Hola {nombre}! 🎉 Te adjudicaron tu {modelo} (grupo {grupo}, "
            "orden {orden}). El acto es el {fecha_acto}."
        ),
        dry_run=dry_run,
    )


def correr_difusion_stock(id_empresa: str, dry_run: bool = True) -> ReporteCampania:
    """Campaña de fidelización: difusión de stock con texto + IMAGEN + BOTONES.

    La imagen sale del campo 'imagen' de cada unidad. {{1}}=nombre, {{2}}=modelo.
    """
    return correr_campania(
        id_empresa=id_empresa,
        linea=LINEA_VENTAS,
        plantilla_logica=PLANTILLA_DIFUSION,
        archivo="difusion_stock.json",
        campos=["nombre", "modelo"],
        cuerpo_preview=(
            "¡Hola {nombre}! 🚗 Tenemos esta {modelo} 0km lista para entrega "
            "a ${precio}. ¿Querés que te pasemos más info?"
        ),
        imagen_campo="imagen",
        dry_run=dry_run,
    )


def _armar_variables(campos: list[str], dato: dict, imagen: str | None) -> dict[str, str]:
    """Arma el dict de variables de la plantilla ({{1}}, {{2}}, ...).

    Si la plantilla lleva imagen, la URL ocupa la variable {{1}} (encabezado) y
    los campos de texto siguen desde {{2}}. El orden debe coincidir con el de la
    plantilla aprobada en Twilio.
    """
    valores = [imagen] if imagen is not None else []
    valores += [str(dato.get(campo, "")) for campo in campos]
    return {str(i + 1): str(valor) for i, valor in enumerate(valores)}


def _render(plantilla_texto: str, dato: dict) -> str:
    """Rellena el texto de vista previa con los datos (tolera campos faltantes)."""
    if not plantilla_texto:
        return ""
    try:
        return plantilla_texto.format_map(_DefaultDict(dato))
    except Exception:  # noqa: BLE001
        return plantilla_texto


class _DefaultDict(dict):
    """Dict que devuelve '' para claves faltantes, para que .format no falle."""

    def __missing__(self, _clave: str) -> str:
        return ""


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
