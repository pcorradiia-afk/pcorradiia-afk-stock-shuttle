"""Prevención de duplicados (rate limiting) para campañas masivas.

Regla de negocio: no enviar la misma campaña al mismo número más de una vez en
24 horas, y de forma independiente por cada empresa (la Marca A y la Marca B
pueden contactar al mismo cliente sin pisarse).

La Fase 1 usa un diccionario en memoria, suficiente para probar la lógica. En
producción esto se reemplaza por Redis o una tabla en Supabase con TTL, sin
cambiar la interfaz pública (`ya_enviado` / `registrar_envio`).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

# Clave compuesta: (id_empresa, campaña, telefono_normalizado) -> momento de envío.
_REGISTRO_ENVIOS: dict[tuple[str, str, str], datetime] = {}

_VENTANA = timedelta(hours=24)


def ya_enviado(id_empresa: str, campania: str, telefono: str) -> bool:
    """True si ya se le envió esta campaña a ese número en las últimas 24 hs."""
    clave = (id_empresa, campania, telefono)
    momento = _REGISTRO_ENVIOS.get(clave)
    if momento is None:
        return False
    return datetime.now(timezone.utc) - momento < _VENTANA


def registrar_envio(id_empresa: str, campania: str, telefono: str) -> None:
    """Marca que se acaba de enviar la campaña a ese número."""
    clave = (id_empresa, campania, telefono)
    _REGISTRO_ENVIOS[clave] = datetime.now(timezone.utc)


def limpiar_registro() -> None:
    """Vacía el registro (sólo para tests)."""
    _REGISTRO_ENVIOS.clear()
