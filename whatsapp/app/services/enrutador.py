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
from ..marcas import (
    LINEA_PLANES,
    LINEA_POSVENTA,
    LINEA_VENTAS,
    Contexto,
    Cuenta,
    contexto_de,
    lineas_de,
)
from ..persistencia import obtener_repo

# Área (para el buzón de Conversaciones) según la opción del menú elegida.
_AREA_POR_OPCION = {
    "Comprar un 0km": "Ventas",
    "Plan Óvalo": "Plan Óvalo",
    "Consultar por usados": "Ventas (usados)",
    "Repuestos": "Repuestos",
    "Taller": "Taller",
}
_AREA_POR_LINEA = {
    LINEA_VENTAS: "Ventas",
    LINEA_PLANES: "Plan Óvalo",
    LINEA_POSVENTA: "Taller",
}
from . import derivacion, encuestas, sesion
from .ia import procesar_con_ia
from .twilio_client import (
    OPCIONES_POR_LINEA,
    enviar_pregunta_interactiva,
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
    media: dict | None = None,
    simular: bool = False,
) -> str | None:
    """Resuelve la línea y aplica las reglas. Devuelve el TwiML a responder (o None).

    `numero_cuenta` es el número de WhatsApp de la concesionaria (el `To`), que
    junto con el teléfono del cliente identifica la sesión. `media` describe un
    adjunto entrante (audio). `simular=True` fuerza respuestas de texto (no envía
    mensajes interactivos reales), para el simulador del panel.
    """
    texto = (cuerpo or "").strip()
    lineas = lineas_de(cuenta)

    # ── 0) RESPUESTA DE ENCUESTA ─────────────────────────────────────────────
    # Tiene prioridad sobre todo: si hay una encuesta abierta, su respuesta manda.
    abierta = encuestas.hay_encuesta_abierta(numero_cuenta, telefono_cliente)
    print(
        f"🔎 [ENCUESTA?] cuenta={numero_cuenta} cliente={telefono_cliente} "
        f"abierta={abierta} texto=«{texto}»"
    )
    if abierta:
        resp = encuestas.registrar_respuesta(numero_cuenta, telefono_cliente, texto, media)
        if resp is not None:
            return _responder_encuesta(resp, telefono_cliente, numero_cuenta, simular)
        print("⚠️  [ENCUESTA] había encuesta abierta pero registrar_respuesta devolvió None")

    # ── A) RESOLUCIÓN DE LÍNEA ───────────────────────────────────────────────
    if len(lineas) == 1:
        # Número dedicado: la línea es directa, sin preguntar.
        ctx = contexto_de(cuenta, lineas[0])
    elif cuenta.marca.menu_opciones:
        # Número multi-línea CON menú de marca: ese menú (sus 5 opciones) ES la
        # entrada. Los NÚMEROS navegan el menú; el TEXTO libre va a la IA en la
        # línea que corresponda. Sin un segundo menú.
        elegida = sesion.linea_elegida(numero_cuenta, telefono_cliente)
        crudo = texto.strip()

        # Volver al menú principal.
        if texto.lower() in _VOLVER:
            sesion.reiniciar(numero_cuenta, telefono_cliente)
            return menu_bienvenida(contexto_de(cuenta, lineas[0]))

        # Número de opción → fija (o cambia) la línea y confirma.
        if crudo.isdigit():
            linea_sel, etiqueta = _opcion_de_menu_marca(cuenta, texto)
            if linea_sel is None:
                return menu_bienvenida(contexto_de(cuenta, lineas[0]))
            sesion.elegir_linea(numero_cuenta, telefono_cliente, linea_sel)
            _fijar_area(
                numero_cuenta, telefono_cliente, _AREA_POR_OPCION.get(etiqueta, etiqueta)
            )
            print(f"🧭 [MENÚ] {telefono_cliente} eligió: {etiqueta} → {linea_sel}")
            return respuesta_texto(
                f"✅ *{etiqueta}* — {cuenta.marca.saludo}. Contame los detalles por "
                "acá y te asesoro 🙌 (o escribí *asesor* para hablar con una persona)."
            )

        if elegida is not None:
            # Ya venía charlando en una línea → seguimos en ese contexto.
            ctx = contexto_de(cuenta, elegida)
        elif not crudo or texto.lower() in _SALUDOS:
            # Saludo o vacío → menú de marca (único).
            return menu_bienvenida(contexto_de(cuenta, lineas[0]))
        else:
            # Texto libre → detectamos la línea por intención y vamos a la IA
            # (si no se detecta, Ventas por defecto).
            linea_sel, _etq = _opcion_de_menu_marca(cuenta, texto)
            defecto = linea_sel or (LINEA_VENTAS if LINEA_VENTAS in lineas else lineas[0])
            sesion.elegir_linea(numero_cuenta, telefono_cliente, defecto)
            _fijar_area(
                numero_cuenta, telefono_cliente, _AREA_POR_LINEA.get(defecto, "Ventas")
            )
            ctx = contexto_de(cuenta, defecto)
    else:
        # Número multi-línea SIN menú de marca: usamos el menú de líneas clásico.
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
    return _responder_en_contexto(ctx, texto, telefono_cliente, numero_cuenta)


def _responder_en_contexto(
    ctx: Contexto, texto: str, telefono_cliente: str, numero_cuenta: str
) -> str | None:
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
        opciones = [f"{t} {e}".strip() for t, e, _ln in ctx.marca.menu_opciones]
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

    # 5) Saludo o pedido de volver → menú de bienvenida.
    if (
        texto_norm in _SALUDOS
        or texto == ""
        or "menu" in texto_norm
        or "menú" in texto_norm
        or "volver" in texto_norm
        or "inicio" in texto_norm
    ):
        return menu_bienvenida(ctx)

    # 6) Texto libre → Agente de IA con el contexto (marca × línea) y memoria.
    return respuesta_texto(procesar_con_ia(ctx, texto, numero_cuenta, telefono_cliente))


def _responder_encuesta(resp, telefono_cliente: str, numero_cuenta: str, simular: bool) -> str | None:
    """Renderiza la respuesta de una encuesta: interactiva (real) o texto (simulador/fallback)."""
    config = obtener_config()
    hay_twilio = bool(config.twilio_account_sid and config.twilio_auth_token)
    # Si la pregunta es tappable y estamos en modo real con credenciales, la
    # enviamos por la API (lista/botones) y respondemos vacío al webhook.
    if resp.interactivo and not simular and hay_twilio:
        try:
            enviar_pregunta_interactiva(
                telefono_cliente, numero_cuenta, resp.interactivo, resp.cuerpo
            )
            # Guardamos la pregunta en el historial para que se vea en el buzón
            # (la pregunta interactiva no pasa por el TwiML, así que la registramos acá).
            try:
                obtener_repo().agregar_historial(
                    numero_cuenta, telefono_cliente, "assistant", resp.cuerpo or resp.texto
                )
            except Exception as exc:  # noqa: BLE001
                print(f"⚠️  [ENCUESTA] no pude guardar la pregunta en el historial: {exc}")
            return None
        except Exception as exc:  # noqa: BLE001
            print(f"⚠️  [ENCUESTA] No se pudo enviar interactivo, mando texto: {exc}")
    return respuesta_texto(resp.texto)


def _fijar_area(numero_cuenta: str, telefono: str, area: str) -> None:
    """Asigna el área de la conversación (best-effort: nunca rompe el flujo del bot)."""
    try:
        obtener_repo().fijar_area(numero_cuenta, telefono, area)
    except Exception as exc:  # noqa: BLE001
        print(f"⚠️  [ÁREA] No se pudo asignar el área: {exc}")


def _opcion_de_menu_marca(cuenta: Cuenta, texto: str) -> tuple[str | None, str | None]:
    """Interpreta el mensaje como opción del menú de marca → (línea, etiqueta).

    Acepta el número de la opción (1..n) o una palabra clave (plan, 0km, taller…).
    Devuelve (None, None) si no reconoce ninguna opción.
    """
    opciones = cuenta.marca.menu_opciones  # cada una: (texto, emoji, línea)
    crudo = texto.strip()
    t = crudo.lower()

    # Por número de opción.
    if crudo.isdigit():
        i = int(crudo)
        if 1 <= i <= len(opciones):
            etiqueta, _emoji, linea = opciones[i - 1]
            return linea, etiqueta

    # Por palabra clave.
    sinonimos = {
        "plan": LINEA_PLANES, "ovalo": LINEA_PLANES, "óvalo": LINEA_PLANES,
        "cuota": LINEA_PLANES, "adjudic": LINEA_PLANES, "licitac": LINEA_PLANES,
        "0km": LINEA_VENTAS, "okm": LINEA_VENTAS, "comprar": LINEA_VENTAS,
        "nuevo": LINEA_VENTAS, "usado": LINEA_VENTAS, "modelo": LINEA_VENTAS,
        "repuesto": LINEA_POSVENTA, "taller": LINEA_POSVENTA,
        "service": LINEA_POSVENTA, "turno": LINEA_POSVENTA,
    }
    for clave, linea in sinonimos.items():
        if clave in t:
            etiqueta = next((tx for tx, _e, ln in opciones if ln == linea), clave)
            return linea, etiqueta

    return None, None


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
