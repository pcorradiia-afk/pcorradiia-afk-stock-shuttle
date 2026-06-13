"""Estado de sesión liviano: recuerda la línea elegida por cada cliente.

Sólo aplica a números que atienden VARIAS líneas: cuando el cliente elige
"Planes" o "Ventas" en el menú de líneas, lo recordamos para no volver a
preguntarle en cada mensaje.

Fase 1: en memoria. Producción: Redis/Supabase con TTL (p. ej. olvidar la
elección tras 1-2 horas de inactividad) sin cambiar esta interfaz.
"""

from __future__ import annotations

# telefono_normalizado -> constante de línea elegida.
_LINEA_ELEGIDA: dict[str, str] = {}


def linea_elegida(telefono: str) -> str | None:
    """Devuelve la línea que el cliente eligió, o None si todavía no eligió."""
    return _LINEA_ELEGIDA.get(telefono)


def elegir_linea(telefono: str, linea: str) -> None:
    """Recuerda la línea elegida por el cliente."""
    _LINEA_ELEGIDA[telefono] = linea


def reiniciar(telefono: str) -> None:
    """Olvida la elección (el cliente quiere volver al menú de líneas)."""
    _LINEA_ELEGIDA.pop(telefono, None)


def limpiar() -> None:
    """Vacía todo el estado (sólo para tests)."""
    _LINEA_ELEGIDA.clear()
