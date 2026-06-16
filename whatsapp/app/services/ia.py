"""Agente de IA con contexto dinámico por marca Y por línea de negocio.

El system prompt CAMBIA según la marca y la línea identificadas en el webhook:
no es lo mismo el asistente de Planes de Ahorro de Pedro Corradi que el de
Venta de 0km de Sapac. Cada uno tiene su propia identidad y su objetivo.

En la Fase 1 la respuesta es SIMULADA (`procesar_con_ia`). Cuando quieras
activar la IA real, poné ``IA_ACTIVA=true`` y completá ``ANTHROPIC_API_KEY``:
el flujo llamará a `_responder_con_claude`, que usa el SDK oficial de Anthropic.
"""

from __future__ import annotations

from ..config import obtener_config
from ..marcas import Contexto


def procesar_con_ia(ctx: Contexto, mensaje: str) -> str:
    """Punto de entrada del Agente de IA para un mensaje de texto libre.

    Decide entre la respuesta simulada (Fase 1) y Claude real (Fase 2) según la
    configuración. Devuelve siempre un texto breve y amable listo para enviar.
    """
    config = obtener_config()

    # --- Demostración del cambio de contexto por marca × línea (visible en consola) ---
    print("\n🧠 [IA] Construyendo contexto dinámico")
    print(f"   Empresa : {ctx.empresa}")
    print(f"   Marca   : {ctx.nombre_marca}")
    print(f"   Línea   : {ctx.etiqueta_linea}")
    print(f"   System prompt activo:\n   «{ctx.system_prompt}»")
    print(f"   Mensaje del cliente : «{mensaje}»")

    if config.ia_activa and config.anthropic_api_key:
        try:
            return _responder_con_claude(
                ctx, mensaje, config.ia_modelo, config.anthropic_api_key
            )
        except Exception as exc:  # noqa: BLE001
            # No dejamos al cliente sin respuesta: logueamos el error y caemos
            # al modo simulado. El log deja claro qué falló (key, modelo, saldo...).
            print(
                f"❌ [IA] Error al llamar a Claude (modelo={config.ia_modelo}): "
                f"{type(exc).__name__}: {exc}"
            )

    # --- Respuesta SIMULADA (Fase 1 / fallback si la IA falla) ---
    return (
        f"[Simulación IA · {ctx.nombre_marca} · {ctx.etiqueta_linea}] ¡Hola! Soy "
        f"el asistente de {ctx.saludo}. Contame en qué te puedo ayudar y te "
        f"oriento. 🚗"
    )


def _responder_con_claude(ctx: Contexto, mensaje: str, modelo: str, api_key: str) -> str:
    """Llama a Claude usando el SDK oficial, con el system prompt del contexto.

    Se importa anthropic acá adentro para que la app arranque aunque la
    dependencia no esté instalada mientras la IA está apagada.
    """
    from anthropic import Anthropic

    cliente = Anthropic(api_key=api_key)
    respuesta = cliente.messages.create(
        model=modelo.strip().lower(),       # los IDs de modelo van en minúscula
        max_tokens=600,                     # respuestas breves, estilo WhatsApp
        system=ctx.system_prompt,           # ← identidad dinámica por marca × línea
        messages=[{"role": "user", "content": mensaje}],
    )

    # Tomamos el primer bloque de texto de la respuesta.
    for bloque in respuesta.content:
        if bloque.type == "text":
            return bloque.text.strip()
    return ""  # Sin texto (p. ej. una negativa de seguridad): el caller decide qué hacer.
