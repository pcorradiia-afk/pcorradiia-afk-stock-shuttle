"""Ventanas de tiempo: detecta si una concesionaria está abierta o cerrada.

Cada marca define su `HorarioAtencion`. Esta función responde, para el momento
actual, si la sucursal está atendiendo y arma un mensaje empático para cuando
está cerrada. La hora se calcula en la zona horaria configurada del grupo.
"""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from ..marcas import Contexto


def esta_abierta(ctx: Contexto, tz: str, ahora: datetime | None = None) -> bool:
    """Devuelve True si la marca está dentro de su horario de atención."""
    momento = ahora or datetime.now(ZoneInfo(tz))
    horario = ctx.horario
    if momento.weekday() not in horario.dias_laborables:
        return False
    return horario.apertura <= momento.hour < horario.cierre


def mensaje_fuera_de_horario(ctx: Contexto) -> str:
    """Texto amable para responder cuando la concesionaria está cerrada."""
    h = ctx.horario
    return (
        f"¡Gracias por escribir a {ctx.saludo}! 🙌 En este momento estamos fuera "
        f"de nuestro horario de atención (lunes a sábado de {h.apertura}:00 a "
        f"{h.cierre}:00 hs). Dejanos tu consulta y un asesor te responde apenas "
        f"reabramos."
    )
