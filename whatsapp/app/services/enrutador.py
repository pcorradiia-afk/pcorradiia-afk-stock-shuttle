"""Cerebro de la conversación: resuelve la línea y decide la respuesta.

Flujo:
  A) RESOLVER LÍNEA (nueva etapa por la dimensión marca × línea):
     - Si la cuenta atiende UNA sola línea → contexto directo.
     - Si atiende VARIAS → si el cliente ya eligió (sesión) usamos esa; si no,
       interpretamos su mensaje como elección o mostramos el menú de líneas.
  B) APLICAR REGLAS dentro del contexto resuelto:
     1) bot pausado (derivación humana) → no responde.
     2) fuera de horario → mensaje empático.
     3) opción del menú (1-3) o "asesor" → acción puntual.
     4) saludo → menú de la línea.
     5) texto libre → Agente de IA con el contexto (marca × línea).

Devuelve TwiML, o None cuando no hay que responder (bot pausado).
"""

from __future__ import annotations

from ..config import obtener_config
from ..core.horarios import esta_abierta, mensaje_fuera_de_horario
from ..marcas import Contexto, Cuenta, contexto_de, lineas_de
from . import derivacion, encuestas, sesion
from .ia import procesar_con_ia
from .twilio_client import (
    OPCIONES_POR_LINEA,
    menu_bienvenida,
    menu_de_lineas,
    respuesta_texto,
)

# Palabras que disparan el saludo/menú inicial.
_SALUDOS = {"hola", "buenas", "buenos dias", "buenas tardes", "menu", "menú", "info"}
# Palabras para volver a elegir línea en un número multi-línea.
_VOLVER = {"volver", "cambiar", "inicio", "menu", "menú"}


def decidir_respuesta(
    cuenta: Cuenta,
    cuerpo: str,
    telefono_cliente: str,
    numero_cuenta: str,
) -> str | None:
    """Resuelve la línea y aplica las reglas. Devuelve el TwiML a responder (o None).

    `numero_cuenta` es el número de WhatsApp de la concesionaria (el `To`), que
    junto con el teléfono del cliente identifica la sesión.
    """
    texto = (cuerpo or "").strip()
    lineas = lineas_de(cuenta)

    # ── 0) RESPUESTA DE ENCUESTA ─────────────────────────────────────────────
    # Tiene prioridad sobre todo: si hay una encuesta abierta y el cliente manda
    # un 1-5, lo tomamos como puntaje (no como opción de menú).
    if encuestas.hay_encuesta_abierta(numero_cuenta, telefono_cliente):
        agradecimiento = encuestas.registrar_respuesta(numero_cuenta, telefono_cliente, texto)
        if agradecimiento is not None:
            return respuesta_texto(agradecimiento)

    # ── A) RESOLUCIÓN DE LÍNEA ───────────────────────────────────────────────
    if len(lineas) == 1:
        # Número dedicado: la línea es directa, sin preguntar.
        ctx = contexto_de(cuenta, lineas[0])
    else:
        # Número multi-línea: necesitamos saber/recordar qué línea quiere.
        # (Una campaña pudo haber dejado la línea ya cebada en la sesión.)
        elegida = sesion.linea_elegida(numero_cuenta, telefono_cliente)

        # Permitir volver al menú de líneas en cualquier momento.
        if texto.lower() in _VOLVER and elegida is not None:
            sesion.reiniciar(numero_cuenta, telefono_cliente)
            return menu_de_lineas(cuenta)

        if elegida is None:
            seleccion = _interpretar_linea(texto, lineas)
            if seleccion is None:
                # Todavía no sabemos la línea → mostramos el menú de líneas.
                return menu_de_lineas(cuenta)
            sesion.elegir_linea(numero_cuenta, telefono_cliente, seleccion)
            ctx = contexto_de(cuenta, seleccion)
            print(f"🧭 [LÍNEA] {telefono_cliente} eligió: {ctx.etiqueta_linea}")
            # Confirmamos mostrando el menú de esa línea.
            return menu_bienvenida(ctx)

        ctx = contexto_de(cuenta, elegida)

    assert ctx is not None  # garantizado por la resolución anterior

    # ── B) REGLAS DENTRO DEL CONTEXTO ────────────────────────────────────────
    return _responder_en_contexto(ctx, texto, telefono_cliente)


def _responder_en_contexto(ctx: Contexto, texto: str, telefono_cliente: str) -> str | None:
    """Aplica las reglas de negocio con la línea ya resuelta."""
    config = obtener_config()
    texto_norm = texto.lower()

    # 1) Bot pausado por derivación humana → no respondemos.
    if derivacion.bot_pausado(telefono_cliente):
        print(f"⏸️  [BOT PAUSADO] Hay un asesor a cargo de {telefono_cliente}; no se responde.")
        return None

    # 2) Pedido de asesor (siempre se atiende, incluso fuera de horario).
    if "asesor" in texto_norm or "humano" in texto_norm:
        return respuesta_texto(derivacion.derivar_a_humano(ctx, telefono_cliente))

    # 3) Fuera de horario → respuesta empática.
    if not esta_abierta(ctx, config.tz_defecto):
        return respuesta_texto(mensaje_fuera_de_horario(ctx))

    # 4) Opción numérica: usa el menú principal de la marca si lo tiene,
    #    o el menú de la línea en su defecto.
    if ctx.marca.menu_opciones:
        opciones = [f"{texto} {emoji}".strip() for texto, emoji in ctx.marca.menu_opciones]
    else:
        opciones = OPCIONES_POR_LINEA.get(ctx.linea, [])
    if texto.isdigit():
        idx = int(texto)
        if 1 <= idx <= len(opciones):
            etiqueta = opciones[idx - 1]
            return respuesta_texto(
                f"✅ {etiqueta} — {ctx.saludo}. Un asesor te ayuda con esto "
                "enseguida; o contame los detalles por acá y te orientamos. 🙌"
            )

    # 5) Saludo → menú de la línea.
    if texto_norm in _SALUDOS or texto == "":
        return menu_bienvenida(ctx)

    # 6) Texto libre → Agente de IA con el contexto (marca × línea).
    return respuesta_texto(procesar_con_ia(ctx, texto))


def _interpretar_linea(texto: str, lineas: list[str]) -> str | None:
    """Interpreta el mensaje como elección de línea: por número o por palabra."""
    texto_norm = texto.lower()

    # Por número del menú de líneas (1..n).
    if texto.isdigit():
        idx = int(texto)
        if 1 <= idx <= len(lineas):
            return lineas[idx - 1]

    # Por palabra clave.
    palabras = {
        "plan": "planes", "planes": "planes", "cuota": "planes", "adjudic": "planes",
        "0km": "ventas", "okm": "ventas", "venta": "ventas", "comprar": "ventas",
        "modelo": "ventas", "usado": "ventas",
        "service": "posventa", "taller": "posventa", "turno": "posventa",
        "posventa": "posventa", "reparac": "posventa",
    }
    for clave, linea in palabras.items():
        if clave in texto_norm and linea in lineas:
            return linea

    return None
