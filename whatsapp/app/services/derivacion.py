"""Botonera de derivación humana y pausa del bot por número.

Cuando un cliente pide "Hablar con un asesor", el sistema:
  1) Pausa el bot/IA para ese número (no le sigue respondiendo automáticamente).
  2) Emite una alerta indicando a qué marca, LÍNEA y vendedor corresponde la
     derivación (no es lo mismo el asesor de planes que el de 0km).

La pausa vive en memoria en la Fase 1. En producción se persiste en
Supabase/Redis para que sobreviva reinicios.
"""

from __future__ import annotations

from ..marcas import Contexto

# Conjunto de números (normalizados) con el bot en pausa por derivación humana.
_BOT_EN_PAUSA: set[str] = set()


def bot_pausado(telefono: str) -> bool:
    """True si el bot está pausado para ese número (hay un humano a cargo)."""
    return telefono in _BOT_EN_PAUSA


def reactivar_bot(telefono: str) -> None:
    """Reactiva el bot para ese número (lo llama el asesor al cerrar la charla)."""
    _BOT_EN_PAUSA.discard(telefono)


def derivar_a_humano(ctx: Contexto, telefono_cliente: str) -> str:
    """Pausa el bot y emite la alerta de derivación. Devuelve el texto al cliente."""
    _BOT_EN_PAUSA.add(telefono_cliente)

    # En producción, esta alerta se manda al canal del vendedor (WhatsApp interno,
    # email, Slack o una fila en el tablero de la empresa). En Fase 1 va a consola.
    print("\n🔔 [DERIVACIÓN] Se solicita un asesor humano")
    print(f"   Empresa  : {ctx.empresa}")
    print(f"   Marca    : {ctx.nombre_marca}")
    print(f"   Línea    : {ctx.etiqueta_linea}")
    print(f"   Asignar a: {ctx.vendedor_derivacion}")
    print(f"   Cliente  : {telefono_cliente}")
    print("   Estado   : bot PAUSADO para este número")

    return (
        f"¡Perfecto! Te estoy comunicando con un asesor de {ctx.saludo} "
        f"({ctx.etiqueta_linea}). En breve una persona del equipo te escribe "
        f"por acá. 🙌"
    )
