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
from ..persistencia import obtener_repo


def procesar_con_ia(ctx: Contexto, mensaje: str, numero_cuenta: str, telefono: str) -> str:
    """Punto de entrada del Agente de IA para un mensaje de texto libre.

    Decide entre la respuesta simulada (Fase 1) y Claude real (Fase 2) según la
    configuración. Usa el historial de la conversación (memoria) para no repetir
    el saludo ni re-preguntar lo que el cliente ya respondió.
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
                ctx, mensaje, numero_cuenta, telefono, config.ia_modelo, config.anthropic_api_key
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


def _responder_con_claude(
    ctx: Contexto,
    mensaje: str,
    numero_cuenta: str,
    telefono: str,
    modelo: str,
    api_key: str,
) -> str:
    """Llama a Claude con el system prompt del contexto Y el historial de la charla.

    Pasar el historial (memoria) es lo que evita que el bot vuelva a saludar y
    re-pregunte: Claude ve toda la conversación y la continúa con naturalidad.
    """
    from anthropic import Anthropic

    repo = obtener_repo()
    historial = repo.historial(numero_cuenta, telefono)

    # Si ya hay charla previa, reforzamos (fuerte) que NO vuelva a saludar.
    system = ctx.system_prompt
    if historial:
        system += (
            "\n\n[CONTEXTO] Ya venís conversando con este cliente (hay mensajes "
            "previos en este chat). NO saludes, NO te presentes y NO escribas "
            "'¡Hola!' ni 'Bienvenido': continuá la charla directo, retomando lo "
            "último que te dijo, sin repetir lo ya dicho."
        )

    cliente = Anthropic(api_key=api_key)
    respuesta = cliente.messages.create(
        model=modelo.strip().lower(),       # los IDs de modelo van en minúscula
        max_tokens=400,                     # respuestas breves, estilo WhatsApp
        system=system,                      # ← identidad dinámica por marca × línea
        messages=historial + [{"role": "user", "content": mensaje}],
    )

    texto = ""
    for bloque in respuesta.content:
        if bloque.type == "text":
            texto = bloque.text.strip()
            break

    # Guardamos la ida y vuelta en el historial (sólo si hubo respuesta), para
    # que el historial quede consistente (user → assistant → user → ...).
    if texto:
        repo.agregar_historial(numero_cuenta, telefono, "user", mensaje)
        repo.agregar_historial(numero_cuenta, telefono, "assistant", texto)

    return texto
