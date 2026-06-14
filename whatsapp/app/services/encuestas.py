"""Encuestas de calidad automatizadas (caso de uso #3).

Cierra el ciclo completo:
  1) ENVIAR: a las 48 hs de un retiro de ventas o de un service, manda la
     pregunta con botones del 1 al 5 (plantilla aprobada).
  2) CAPTURAR: cuando el cliente responde 1-5, lo tomamos en el /webhook.
  3) GUARDAR: el resultado queda en el tablero de la empresa que prestó el
     servicio.

╔══════════════════════════════════════════════════════════════════════════╗
║  PREGUNTAS PROVISIONALES                                                    ║
║  El texto de abajo (PREGUNTAS) es un borrador. Cuando tengas las preguntas  ║
║  definitivas, editá SOLO ese diccionario — la lógica no cambia. (El texto   ║
║  real también debe cargarse en la plantilla aprobada de WhatsApp.)          ║
╚══════════════════════════════════════════════════════════════════════════╝

Fase 1: todo en memoria (pendientes, resultados). Producción: Supabase, sin
cambiar esta interfaz.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta
from pathlib import Path

from ..config import obtener_config
from ..core.normalizacion import normalizar_telefono
from ..marcas import LINEA_POSVENTA, buscar_por_empresa
from ..persistencia import obtener_repo
from . import sesion
from .twilio_client import enviar_plantilla

_DIR_DATOS = Path(__file__).resolve().parents[2] / "data"

# Horas a esperar después del evento antes de mandar la encuesta.
HORAS_ESPERA = 48

# Plantilla aprobada que se usa para la encuesta (vive en la línea de Posventa).
PLANTILLA_ENCUESTA = "encuesta_calidad"

# ── PREGUNTAS PROVISIONALES (editá acá cuando tengas las definitivas) ─────────
PREGUNTAS: dict[str, str] = {
    "ventas": (
        "Hola {nombre} 👋 En {empresa} queremos mejorar. Del 1 al 5, ¿cómo fue tu "
        "experiencia comprando tu {referencia}? (1 = muy mala, 5 = excelente)"
    ),
    "taller": (
        "Hola {nombre} 👋 En {empresa} queremos mejorar. Del 1 al 5, ¿qué tan "
        "conforme quedaste con el service de tu {referencia}? (1 = muy malo, "
        "5 = excelente)"
    ),
}
_PREGUNTA_DEFECTO = (
    "Hola {nombre} 👋 Del 1 al 5, ¿cómo calificás la atención de {empresa}? "
    "(1 = muy mala, 5 = excelente)"
)


class EncuestaError(Exception):
    """Error de configuración de encuestas (empresa/plantilla/archivo inexistente)."""


@dataclass
class ResultadoEncuesta:
    """Una respuesta de encuesta guardada en el tablero de la empresa."""

    id_empresa: str
    telefono: str
    tipo: str          # "ventas" | "taller"
    referencia: str    # modelo comprado o service realizado
    valor: int         # 1..5
    fecha: str         # ISO de cuando respondió


@dataclass
class ResultadoEnvioEncuesta:
    """Qué pasó al intentar enviar la encuesta a un cliente."""

    telefono: str
    estado: str        # "enviada" | "simulada" | "no_corresponde" | "ya_enviada" | "error"
    detalle: str = ""
    vista_previa: str = ""


@dataclass
class ReporteEncuestas:
    """Resumen de una corrida de envío de encuestas pendientes."""

    id_empresa: str
    numero_origen: str
    modo: str
    total: int = 0
    enviadas: int = 0
    simuladas: int = 0
    no_corresponde: int = 0   # todavía no pasaron 48 hs
    ya_enviadas: int = 0
    errores: int = 0
    resultados: list[ResultadoEnvioEncuesta] = field(default_factory=list)


def correr_encuestas_pendientes(
    id_empresa: str,
    ahora: datetime | None = None,
    dry_run: bool = True,
) -> ReporteEncuestas:
    """Envía las encuestas cuyo evento ya cumplió 48 hs y que no se enviaron aún.

    Lee `data/<id_empresa>/encuestas_pendientes.json` (lista de eventos de retiro
    o service). Pensado para que un scheduler (cron/APScheduler) lo llame seguido.
    """
    encontrado = buscar_por_empresa(id_empresa, LINEA_POSVENTA)
    if encontrado is None:
        raise EncuestaError(
            f"La empresa '{id_empresa}' no tiene línea de Posventa configurada."
        )
    numero_origen, ctx = encontrado

    plantilla = ctx.plantillas.get(PLANTILLA_ENCUESTA)
    if plantilla is None:
        raise EncuestaError(
            f"La Posventa de {ctx.empresa} no tiene la plantilla '{PLANTILLA_ENCUESTA}'."
        )

    eventos = _cargar_datos(id_empresa, "encuestas_pendientes.json")
    momento = ahora or datetime.now()
    repo = obtener_repo()

    config = obtener_config()
    usar_twilio = (not dry_run) and bool(
        config.twilio_account_sid and config.twilio_auth_token
    )
    reporte = ReporteEncuestas(
        id_empresa=id_empresa,
        numero_origen=numero_origen,
        modo="real" if usar_twilio else "simulado",
        total=len(eventos),
    )

    print("\n" + "=" * 64)
    print(f"📝 [ENCUESTAS] {ctx.empresa} · Posventa   Modo: {reporte.modo}")
    print("=" * 64)

    for evento in eventos:
        telefono = normalizar_telefono(evento.get("telefono"))
        tipo = evento.get("tipo", "taller")
        referencia = evento.get("referencia", "")
        fecha_evento = evento.get("fecha_evento", "")

        if not telefono:
            reporte.errores += 1
            reporte.resultados.append(
                ResultadoEnvioEncuesta("?", "error", "teléfono inválido")
            )
            continue

        # ¿Ya pasaron las 48 hs del evento?
        if not _corresponde_enviar(fecha_evento, momento):
            reporte.no_corresponde += 1
            reporte.resultados.append(
                ResultadoEnvioEncuesta(telefono, "no_corresponde", "aún no cumplió 48 hs")
            )
            print(f"   ⏳ {telefono} · todavía no pasaron 48 hs")
            continue

        # Evitar reenviar la misma encuesta.
        if repo.encuesta_enviada(id_empresa, telefono, fecha_evento):
            reporte.ya_enviadas += 1
            reporte.resultados.append(
                ResultadoEnvioEncuesta(telefono, "ya_enviada", "encuesta ya enviada")
            )
            print(f"   ⏭️  {telefono} · ya enviada")
            continue

        # Texto (provisional) y variables de la plantilla: {{1}}=nombre, {{2}}=referencia.
        preview = _texto_pregunta(tipo).format_map(
            _DefaultDict({**evento, "empresa": ctx.empresa})
        )
        variables = {"1": str(evento.get("nombre", "")), "2": str(referencia)}

        try:
            if usar_twilio:
                sid = enviar_plantilla(telefono, numero_origen, plantilla.sid, variables)
                reporte.enviadas += 1
                reporte.resultados.append(
                    ResultadoEnvioEncuesta(telefono, "enviada", sid, preview)
                )
                print(f"   ✅ {telefono} · enviada ({sid})")
            else:
                reporte.simuladas += 1
                reporte.resultados.append(
                    ResultadoEnvioEncuesta(telefono, "simulada", "dry-run", preview)
                )
                print(f"   🧪 {telefono} · simulada\n        pregunta: {preview}")

            repo.marcar_encuesta_enviada(id_empresa, telefono, fecha_evento)
            # Abrimos la encuesta y cebamos la línea de Posventa para capturar la
            # respuesta del cliente (1-5) cuando conteste.
            repo.abrir_encuesta(
                numero_origen,
                telefono,
                {"id_empresa": id_empresa, "tipo": tipo, "referencia": referencia},
            )
            sesion.elegir_linea(numero_origen, telefono, LINEA_POSVENTA)
        except Exception as exc:  # noqa: BLE001
            reporte.errores += 1
            reporte.resultados.append(ResultadoEnvioEncuesta(telefono, "error", str(exc)))
            print(f"   ❌ {telefono} · error: {exc}")

    print(
        f"   Resumen: enviadas={reporte.enviadas} simuladas={reporte.simuladas} "
        f"sin_corresponder={reporte.no_corresponde} ya_enviadas={reporte.ya_enviadas} "
        f"errores={reporte.errores}"
    )
    return reporte


def hay_encuesta_abierta(numero_cuenta: str, telefono: str) -> bool:
    """True si hay una encuesta esperando la respuesta de ese cliente."""
    return obtener_repo().encuesta_abierta(numero_cuenta, telefono) is not None


def registrar_respuesta(numero_cuenta: str, telefono: str, texto: str) -> str | None:
    """Si hay encuesta abierta y `texto` es un 1-5 válido, guarda y agradece.

    Devuelve el texto de agradecimiento, o None si la respuesta no es un 1-5
    (en ese caso el enrutador sigue con el flujo normal y la encuesta queda
    abierta para que el cliente la conteste).
    """
    repo = obtener_repo()
    contexto = repo.encuesta_abierta(numero_cuenta, telefono)
    if contexto is None:
        return None

    valor = _parsear_valor(texto)
    if valor is None:
        return None  # no es 1-5: dejamos la encuesta abierta

    repo.guardar_resultado(
        asdict(
            ResultadoEncuesta(
                id_empresa=contexto["id_empresa"],
                telefono=telefono,
                tipo=contexto["tipo"],
                referencia=contexto["referencia"],
                valor=valor,
                fecha=datetime.now().isoformat(timespec="seconds"),
            )
        )
    )
    repo.cerrar_encuesta(numero_cuenta, telefono)
    print(
        f"⭐ [ENCUESTA] {telefono} respondió {valor}/5 "
        f"({contexto['id_empresa']} · {contexto['tipo']})"
    )

    if valor <= 2:
        return (
            "¡Gracias por tu respuesta! 🙏 Lamentamos que la experiencia no haya "
            "sido la mejor. Un responsable se va a contactar para ayudarte."
        )
    return "¡Gracias por tu respuesta! 🙌 Nos ayuda muchísimo a seguir mejorando."


def tablero(id_empresa: str) -> dict:
    """Resumen de resultados de la empresa (el 'tablero')."""
    items = obtener_repo().resultados(id_empresa)
    total = len(items)
    promedio = round(sum(r["valor"] for r in items) / total, 2) if total else None
    distribucion = {str(n): sum(1 for r in items if r["valor"] == n) for n in range(1, 6)}
    return {
        "id_empresa": id_empresa,
        "respuestas": total,
        "promedio": promedio,
        "distribucion": distribucion,
        "detalle": items,
    }


def limpiar() -> None:
    """Vacía el estado (sólo para tests, en backend de memoria)."""
    obtener_repo().limpiar_todo()


# ── Helpers ──────────────────────────────────────────────────────────────────
def _texto_pregunta(tipo: str) -> str:
    return PREGUNTAS.get(tipo, _PREGUNTA_DEFECTO)


def _corresponde_enviar(fecha_evento: str, ahora: datetime) -> bool:
    """True si ya pasaron HORAS_ESPERA desde el evento."""
    try:
        momento_evento = datetime.fromisoformat(fecha_evento)
    except (TypeError, ValueError):
        return False
    return momento_evento + timedelta(hours=HORAS_ESPERA) <= ahora


def _parsear_valor(texto: str) -> int | None:
    """Interpreta la respuesta del cliente como un puntaje del 1 al 5."""
    limpio = (texto or "").strip()
    if limpio.isdigit():
        n = int(limpio)
        if 1 <= n <= 5:
            return n
    return None


class _DefaultDict(dict):
    def __missing__(self, _clave: str) -> str:
        return ""


def _cargar_datos(id_empresa: str, archivo: str) -> list[dict]:
    ruta = _DIR_DATOS / id_empresa / archivo
    if not ruta.exists():
        raise EncuestaError(f"No se encontró el archivo de datos: {ruta}")
    with ruta.open(encoding="utf-8") as f:
        datos = json.load(f)
    if not isinstance(datos, list):
        raise EncuestaError(f"El archivo {ruta} debe contener una lista de eventos.")
    return datos
