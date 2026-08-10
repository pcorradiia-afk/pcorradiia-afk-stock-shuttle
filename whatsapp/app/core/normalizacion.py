"""Normalización de números de teléfono de LatAm al formato internacional.

Twilio exige el formato E.164 (``+549...`` para celulares argentinos). Los
clientes y los archivos del DMS escriben los números de mil maneras:
``0351 15 555-1234``, ``351155551234``, ``+54 351 555 1234``, etc.
Esta función limpia esas variantes y devuelve una clave única y consistente
para buscar marcas y evitar duplicados.

Nota: el foco de la Fase 1 es Argentina (+54, con el 9 de celular). La función
está escrita para extenderse fácilmente a otros países de LatAm.
"""

from __future__ import annotations

import re

# Código de país por defecto cuando el número viene sin prefijo internacional.
_CODIGO_PAIS_DEFECTO = "54"


def normalizar_telefono(crudo: str | None, codigo_pais: str = _CODIGO_PAIS_DEFECTO) -> str:
    """Convierte un número en cualquier formato local al formato E.164 limpio.

    Ejemplos (Argentina)::

        "whatsapp:+5493515551234" -> "+5493515551234"
        "0351 15 555-1234"        -> "+5493515551234"
        "+54 9 351 555 1234"      -> "+5493515551234"

    Si la entrada está vacía, devuelve "".
    """
    if not crudo:
        return ""

    # 1) Sacamos el prefijo de canal de Twilio ("whatsapp:") y espacios.
    texto = crudo.strip()
    texto = re.sub(r"^\s*whatsapp:\s*", "", texto, flags=re.IGNORECASE)

    # 2) Recordamos si venía con '+' (ya era internacional) antes de limpiar.
    tenia_mas = texto.lstrip().startswith("+")

    # 3) Nos quedamos solo con dígitos.
    digitos = re.sub(r"\D", "", texto)
    if not digitos:
        return ""

    if tenia_mas:
        # Ya estaba en formato internacional: confiamos en los dígitos tal cual.
        return _asegurar_nueve_argentino("+" + digitos, codigo_pais)

    # 4) Formato local con 0 inicial (ej: "0351 15 5551234"): sacamos el 0 de
    #    área y el 15 de celular que aparece justo después del código de área.
    #    El "15" SOLO se quita en este caso: si el número viene sin 0 inicial lo
    #    tratamos como número nacional (área + número) ya limpio, para no comernos
    #    dígitos de un número como "3515554321".
    if digitos.startswith("0"):
        digitos = digitos[1:]
        digitos = re.sub(r"^(\d{2,4})15", r"\1", digitos, count=1)

    return _asegurar_nueve_argentino(f"+{codigo_pais}{digitos}", codigo_pais)


def _asegurar_nueve_argentino(numero_e164: str, codigo_pais: str) -> str:
    """Inserta el '9' de celular argentino si falta (regla específica de +54).

    Argentina usa ``+549`` + área + número para WhatsApp/celular. Si el número
    llega como ``+54`` + área sin el 9, lo agregamos.
    """
    if codigo_pais != "54":
        return numero_e164  # Otros países: por ahora no tocamos.

    cuerpo = numero_e164[1:]  # sin el '+'
    if cuerpo.startswith("549"):
        return numero_e164
    if cuerpo.startswith("54"):
        resto = cuerpo[2:]
        return f"+549{resto}"
    return numero_e164
