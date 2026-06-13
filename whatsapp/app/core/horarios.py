"""Ventanas de tiempo: detecta si una concesionaria está abierta o cerrada.

Cada marca define su `HorarioAtencion`. Esta función responde, para el momento
actual, si la sucursal está atendiendo y arma un mensaje empático para cuando
está cerrada. La hora se calcula en la zona horaria configurada del grupo.
"""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from ..marcas import Marca


def esta_abierta(marca: Marca, tz: str, ahora: datetime | None = None) -> bool:
    """Devuelve True si la marca está dentro de su horario de atención."""
    momento = ahora or datetime.now(ZoneInfo(tz))
    if momento.weekday() not in marca.horario.dias_laborables:
        return False
    return marca.horario.apertura <= momento.hour < marca.horario.cierre


def mensaje_fuera_de_horario(marca: Marca) -> str:
    """Texto amable para responder cuando la concesionaria está cerrada."""
    h = marca.horario
    return (
        f"¡Gracias por escribir a {marca.saludo}! 🙌 En este momento estamos "
        f"fuera de nuestro horario de atención (lunes a sábado de "
        f"{h.apertura}:00 a {h.cierre}:00 hs). Dejanos tu consulta y un asesor "
        f"te responde apenas reabramos."
    )
