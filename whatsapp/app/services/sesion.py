"""Estado de sesión liviano: recuerda la línea elegida por cada cliente.

La clave es ``(numero_cuenta, telefono)``: el número de la concesionaria MÁS el
del cliente. Así, si el mismo cliente habla con dos empresas distintas, cada
conversación mantiene su propia línea sin mezclarse.

Se usa de dos formas:
  - El cliente elige una línea en el menú (números multi-línea).
  - Una campaña "ceba" el contexto: al contactar por la línea de Ventas, dejamos
    esa línea preseleccionada para que la respuesta del cliente caiga ahí.

Fase 1: en memoria. Producción: Redis/Supabase con TTL (olvidar tras 1-2 hs de
inactividad) sin cambiar esta interfaz.
"""

from __future__ import annotations

# (numero_cuenta, telefono) -> constante de línea elegida.
_LINEA_ELEGIDA: dict[tuple[str, str], str] = {}


def linea_elegida(numero_cuenta: str, telefono: str) -> str | None:
    """Devuelve la línea que el cliente eligió en esa cuenta, o None."""
    return _LINEA_ELEGIDA.get((numero_cuenta, telefono))


def elegir_linea(numero_cuenta: str, telefono: str, linea: str) -> None:
    """Recuerda la línea elegida (o cebada por una campaña) para el cliente."""
    _LINEA_ELEGIDA[(numero_cuenta, telefono)] = linea


def reiniciar(numero_cuenta: str, telefono: str) -> None:
    """Olvida la elección (el cliente quiere volver al menú de líneas)."""
    _LINEA_ELEGIDA.pop((numero_cuenta, telefono), None)


def limpiar() -> None:
    """Vacía todo el estado (sólo para tests)."""
    _LINEA_ELEGIDA.clear()
