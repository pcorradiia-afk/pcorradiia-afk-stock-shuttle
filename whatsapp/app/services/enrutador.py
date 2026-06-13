"""Cerebro de la conversación: decide la respuesta según la marca y el mensaje.

Orquesta las reglas de negocio en orden:
  1) Si el bot está pausado (hay un humano), no responde automáticamente.
  2) Si la concesionaria está cerrada, responde empáticamente.
  3) Si el cliente eligió una opción del menú (1-4), actúa en consecuencia.
  4) Si es texto libre, lo deriva al Agente de IA con el contexto de la marca.

Devuelve TwiML listo para que el webhook lo retorne a Twilio. Si devuelve None,
el webhook responde con un 200 vacío (no se le contesta nada al cliente: caso
del bot pausado).
"""

from __future__ import annotations

from ..config import obtener_config
from ..core.horarios import esta_abierta, mensaje_fuera_de_horario
from ..marcas import Marca
from . import derivacion
from .ia import procesar_con_ia
from .twilio_client import menu_bienvenida, respuesta_texto


# Palabras/numeros que disparan el saludo inicial con el menú.
_SALUDOS = {"hola", "buenas", "buenos dias", "buenas tardes", "menu", "menú", "info"}


def decidir_respuesta(marca: Marca, cuerpo: str, telefono_cliente: str) -> str | None:
    """Aplica las reglas de negocio y devuelve el TwiML a responder (o None)."""
    config = obtener_config()
    texto = (cuerpo or "").strip()
    texto_norm = texto.lower()

    # 1) Bot pausado por derivación humana → no respondemos automáticamente.
    if derivacion.bot_pausado(telefono_cliente):
        print(f"⏸️  [BOT PAUSADO] Hay un asesor a cargo de {telefono_cliente}; no se responde.")
        return None

    # 2) Fuera de horario → respuesta empática (salvo que pidan un asesor, que se
    #    deriva igual para no perder el lead).
    if not esta_abierta(marca, config.tz_defecto) and texto != "4":
        return respuesta_texto(mensaje_fuera_de_horario(marca))

    # 3) Opciones del menú.
    if texto == "4" or "asesor" in texto_norm or "humano" in texto_norm:
        return respuesta_texto(derivacion.derivar_a_humano(marca, telefono_cliente))
    if texto == "1":
        return respuesta_texto(
            f"🚗 Te paso el catálogo de modelos {marca.marca} disponibles en "
            f"{marca.saludo}. (En la Fase 2 se enlaza al stock real por empresa.)"
        )
    if texto == "2":
        return respuesta_texto(
            "📄 Para tu plan de ahorro decime tu número de grupo y orden, y un "
            "asesor verifica el estado de cuotas y adjudicaciones."
        )
    if texto == "3":
        return respuesta_texto(
            f"🔧 Coordinemos tu turno de service en {marca.saludo}. Decime modelo, "
            "patente y kilometraje aproximado."
        )

    # 4) Saludo inicial → mostramos el menú de la marca.
    if texto_norm in _SALUDOS or texto == "":
        return menu_bienvenida(marca)

    # 5) Texto libre → Agente de IA con el contexto de la marca.
    return respuesta_texto(procesar_con_ia(marca, texto))
