"""Agente de IA con contexto dinámico por marca.

El system prompt CAMBIA según la marca identificada en el webhook: si el cliente
escribe al número de Pedro Corradi, la IA habla como especialista Volkswagen de
Pedro Corradi; si escribe a Sapac, adopta la identidad Toyota de Sapac.

En la Fase 1 la respuesta es SIMULADA (`procesar_con_ia`) para que puedas ver
cómo se arma el prompt sin gastar tokens ni necesitar API key. Cuando quieras
activar la IA real, poné ``IA_ACTIVA=true`` y completá ``ANTHROPIC_API_KEY`` en
el .env: el flujo llamará a `_responder_con_claude`, que usa el SDK oficial de
Anthropic.
"""

from __future__ import annotations

from ..config import obtener_config
from ..marcas import Marca


def procesar_con_ia(marca: Marca, mensaje: str) -> str:
    """Punto de entrada del Agente de IA para un mensaje de texto libre.

    Decide entre la respuesta simulada (Fase 1) y Claude real (Fase 2) según la
    configuración. Devuelve siempre un texto breve y amable listo para enviar.
    """
    config = obtener_config()

    # --- Demostración del cambio de contexto por marca (siempre visible en consola) ---
    print("\n🧠 [IA] Construyendo contexto dinámico por marca")
    print(f"   Empresa : {marca.empresa}")
    print(f"   Marca   : {marca.marca}")
    print(f"   System prompt activo:\n   «{marca.system_prompt}»")
    print(f"   Mensaje del cliente : «{mensaje}»")

    if config.ia_activa and config.anthropic_api_key:
        return _responder_con_claude(marca, mensaje, config.ia_modelo, config.anthropic_api_key)

    # --- Respuesta SIMULADA de Fase 1 ---
    return (
        f"[Simulación IA · {marca.marca}] ¡Hola! Soy el asistente de "
        f"{marca.saludo}. Contame qué modelo {marca.marca} te interesa, si "
        f"tenés un usado para entregar y cómo pensás la compra, así te ayudo "
        f"mejor. 🚗"
    )


def _responder_con_claude(marca: Marca, mensaje: str, modelo: str, api_key: str) -> str:
    """Llama a Claude usando el SDK oficial, con el system prompt de la marca.

    Se importa anthropic acá adentro para que la app arranque aunque la
    dependencia no esté instalada mientras la IA está apagada.
    """
    from anthropic import Anthropic

    cliente = Anthropic(api_key=api_key)
    respuesta = cliente.messages.create(
        model=modelo,                       # claude-opus-4-8 por defecto
        max_tokens=1024,
        system=marca.system_prompt,         # ← identidad dinámica por marca
        thinking={"type": "adaptive"},      # el modelo decide cuánto razonar
        messages=[{"role": "user", "content": mensaje}],
    )

    # Tomamos el primer bloque de texto de la respuesta.
    for bloque in respuesta.content:
        if bloque.type == "text":
            return bloque.text.strip()
    return ""  # Sin texto (p. ej. una negativa de seguridad): el caller decide qué hacer.
