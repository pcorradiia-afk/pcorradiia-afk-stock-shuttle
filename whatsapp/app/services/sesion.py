"""Estado de sesión: recuerda la línea elegida por cada cliente.

La clave es ``(numero_cuenta, telefono)``: el número de la concesionaria MÁS el
del cliente, para que dos empresas no se mezclen. El estado se delega al
repositorio de persistencia (memoria o Supabase), sin cambiar la interfaz.
"""

from __future__ import annotations

from ..persistencia import obtener_repo


def linea_elegida(numero_cuenta: str, telefono: str) -> str | None:
    """Devuelve la línea que el cliente eligió en esa cuenta, o None."""
    return obtener_repo().linea_elegida(numero_cuenta, telefono)


def elegir_linea(numero_cuenta: str, telefono: str, linea: str) -> None:
    """Recuerda la línea elegida (o cebada por una campaña) para el cliente."""
    obtener_repo().fijar_linea(numero_cuenta, telefono, linea)


def reiniciar(numero_cuenta: str, telefono: str) -> None:
    """Olvida la elección (el cliente quiere volver al menú de líneas)."""
    obtener_repo().olvidar_linea(numero_cuenta, telefono)
