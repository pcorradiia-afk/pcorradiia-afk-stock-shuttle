"""Prevención de duplicados (rate limiting) para campañas masivas.

Regla de negocio: no enviar la misma campaña al mismo número más de una vez en
24 horas, de forma independiente por cada empresa.

El estado se guarda en el repositorio de persistencia (memoria o Supabase según
la configuración), así que la interfaz pública no cambia.
"""

from __future__ import annotations

from ..persistencia import obtener_repo


def ya_enviado(id_empresa: str, campania: str, telefono: str) -> bool:
    """True si ya se le envió esta campaña a ese número en las últimas 24 hs."""
    return obtener_repo().campania_ya_enviada(id_empresa, campania, telefono)


def registrar_envio(id_empresa: str, campania: str, telefono: str) -> None:
    """Marca que se acaba de enviar la campaña a ese número."""
    obtener_repo().registrar_campania(id_empresa, campania, telefono)


def limpiar_registro() -> None:
    """Vacía el registro (sólo para tests, en backend de memoria)."""
    obtener_repo().limpiar_todo()
