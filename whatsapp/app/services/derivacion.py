"""Botonera de derivación humana y pausa del bot por número.

Cuando un cliente pide "Hablar con un asesor", el sistema:
  1) Pausa el bot/IA para ese número (no le sigue respondiendo automáticamente).
  2) Emite una alerta indicando a qué marca, LÍNEA y vendedor corresponde la
     derivación (no es lo mismo el asesor de planes que el de 0km).

La pausa se guarda en el repositorio de persistencia (memoria o Supabase), así
sobrevive reinicios cuando hay base configurada.
"""

from __future__ import annotations

from ..marcas import Contexto
from ..persistencia import obtener_repo


def bot_pausado(telefono: str) -> bool:
    """True si el bot está pausado para ese número (hay un humano a cargo)."""
    return obtener_repo().bot_pausado(telefono)


def reactivar_bot(telefono: str) -> None:
    """Reactiva el bot para ese número (lo llama el asesor al cerrar la charla)."""
    obtener_repo().reactivar_bot(telefono)


def derivar_a_humano(ctx: Contexto, telefono_cliente: str) -> str:
    """Pausa el bot y emite la alerta de derivación. Devuelve el texto al cliente."""
    obtener_repo().pausar_bot(telefono_cliente)

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
