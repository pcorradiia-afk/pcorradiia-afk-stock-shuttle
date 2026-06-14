"""Scheduler de envíos automáticos (APScheduler, dentro de la app).

Cada cierto intervalo recorre las empresas con línea de Posventa y dispara las
encuestas cuyo evento ya cumplió 48 hs (la dedupe evita reenviar). Así el flujo
funciona solo, sin que nadie tenga que pegarle al endpoint.

Corre en un hilo aparte (BackgroundScheduler), así no bloquea al servidor web.
Se enciende/apaga con el ciclo de vida de FastAPI (ver main.py) y se puede
desactivar con ``SCHEDULER_ACTIVO=false`` en el .env.
"""

from __future__ import annotations

from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler

from ..config import obtener_config
from ..marcas import LINEA_POSVENTA, empresas_con_linea
from .encuestas import EncuestaError, correr_encuestas_pendientes

_scheduler = BackgroundScheduler()


def iniciar_scheduler() -> None:
    """Arranca el scheduler (si está activo en la configuración)."""
    config = obtener_config()
    if not config.scheduler_activo:
        print("⏰ [SCHEDULER] Desactivado (SCHEDULER_ACTIVO=false)")
        return

    _scheduler.add_job(
        _revisar_encuestas,
        trigger="interval",
        minutes=config.scheduler_intervalo_min,
        id="encuestas_48h",
        next_run_time=datetime.now(),  # corre una vez al arrancar, sin esperar
        replace_existing=True,
    )
    _scheduler.start()
    modo = "SIMULA" if config.encuestas_dry_run else "ENVÍA DE VERDAD"
    print(
        f"⏰ [SCHEDULER] Activo · revisa encuestas cada "
        f"{config.scheduler_intervalo_min} min · modo: {modo}"
    )


def detener_scheduler() -> None:
    """Detiene el scheduler al apagar la app."""
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        print("⏰ [SCHEDULER] Detenido")


def _revisar_encuestas() -> None:
    """Job: por cada empresa con Posventa, envía las encuestas que correspondan."""
    config = obtener_config()
    print(f"\n⏰ [SCHEDULER] Revisando encuestas pendientes ({datetime.now():%Y-%m-%d %H:%M})")
    for id_empresa in empresas_con_linea(LINEA_POSVENTA):
        try:
            correr_encuestas_pendientes(id_empresa, dry_run=config.encuestas_dry_run)
        except EncuestaError as exc:
            # Empresa sin archivo de eventos o sin plantilla: se saltea sin frenar.
            print(f"   ↪️  {id_empresa}: {exc}")
        except Exception as exc:  # noqa: BLE001 — el scheduler nunca debe morir por un error
            print(f"   ❌ {id_empresa}: error inesperado: {exc}")
