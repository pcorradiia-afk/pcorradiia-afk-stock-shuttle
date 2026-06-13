"""Registro multi-marca: la "tabla de configuración" del sistema.

Cada número de WhatsApp de Twilio (el parámetro `To` que llega en el webhook)
se mapea a una marca/empresa con su propia identidad, plantillas aprobadas,
prompt de IA y horario de atención.

En la Fase 1 esto vive en un diccionario en memoria. En la Fase 2 la misma
estructura se puede leer desde Supabase o desde un Google Sheet sin cambiar el
resto del código: lo único que importa es que `buscar_marca(to)` devuelva un
objeto `Marca`.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .core.normalizacion import normalizar_telefono


@dataclass(frozen=True)
class HorarioAtencion:
    """Ventana de atención de una concesionaria (hora local de la marca)."""

    apertura: int = 9          # Hora de apertura (0-23)
    cierre: int = 18           # Hora de cierre (0-23)
    dias_laborables: tuple[int, ...] = (0, 1, 2, 3, 4, 5)  # lunes=0 ... sábado=5


@dataclass(frozen=True)
class Marca:
    """Identidad y comportamiento de una marca/empresa del grupo."""

    id_empresa: str            # Identificador interno (coincide con la carpeta /data)
    empresa: str               # Razón social de la concesionaria
    marca: str                 # Marca comercial que representa
    saludo: str                # Nombre con el que el bot se presenta
    system_prompt: str         # Identidad de la IA para esta marca
    vendedor_derivacion: str   # A quién avisar cuando piden un asesor humano
    horario: HorarioAtencion = field(default_factory=HorarioAtencion)
    # Plantillas aprobadas (HSM) por nombre lógico → SID de la plantilla en Twilio.
    plantillas: dict[str, str] = field(default_factory=dict)


# =====================================================================
#  REGISTRO DE MARCAS
#  Clave = número de WhatsApp de Twilio en formato internacional limpio.
#  (Los SID de plantilla 'HXxxxx' son ficticios; se reemplazan por los reales
#   una vez aprobados en el panel de Twilio / Meta.)
# =====================================================================
_REGISTRO: dict[str, Marca] = {
    # ---- MARCA A: Pedro Corradi ----
    "+5493510000001": Marca(
        id_empresa="empresa_pedro_corradi",
        empresa="Pedro Corradi S.A.",
        marca="Volkswagen",
        saludo="Pedro Corradi",
        vendedor_derivacion="Equipo comercial Pedro Corradi",
        system_prompt=(
            "Sos el asistente virtual de Pedro Corradi, concesionario oficial "
            "Volkswagen. Hablás en español rioplatense, de forma breve, amable y "
            "profesional. Tu objetivo es calificar el lead detectando: (1) el "
            "modelo Volkswagen de interés, (2) si tiene un usado para entregar como "
            "parte de pago, y (3) su capacidad o forma de pago (contado, financiado "
            "o plan de ahorro). Nunca inventás precios ni stock; si no sabés algo, "
            "ofrecés derivar a un asesor."
        ),
        horario=HorarioAtencion(apertura=9, cierre=18),
        plantillas={
            "adjudicacion_plan": "HX1111111111111111111111111111aaaa",
            "encuesta_calidad": "HX1111111111111111111111111111bbbb",
            "cupon_pago": "HX1111111111111111111111111111cccc",
        },
    ),
    # ---- MARCA B: Sapac ----
    "+5493510000002": Marca(
        id_empresa="empresa_sapac",
        empresa="Sapac S.A.",
        marca="Toyota",
        saludo="Sapac",
        vendedor_derivacion="Equipo comercial Sapac",
        system_prompt=(
            "Sos el asistente virtual de Sapac, concesionario oficial Toyota. "
            "Hablás en español rioplatense, de forma breve, amable y profesional. "
            "Tu objetivo es calificar el lead detectando: (1) el modelo Toyota de "
            "interés, (2) si tiene un usado para entregar como parte de pago, y "
            "(3) su capacidad o forma de pago (contado, financiado o plan de "
            "ahorro). Nunca inventás precios ni stock; si no sabés algo, ofrecés "
            "derivar a un asesor."
        ),
        horario=HorarioAtencion(apertura=8, cierre=17),
        plantillas={
            "adjudicacion_plan": "HX2222222222222222222222222222aaaa",
            "encuesta_calidad": "HX2222222222222222222222222222bbbb",
            "cupon_pago": "HX2222222222222222222222222222cccc",
        },
    ),
}


def buscar_marca(numero_destino: str) -> Marca | None:
    """Encuentra la marca a partir del número `To` que llega del webhook.

    Twilio entrega el número como ``whatsapp:+549...``. Lo normalizamos antes de
    buscar para tolerar prefijos (``whatsapp:``) y formatos locales.
    """
    clave = normalizar_telefono(numero_destino)
    return _REGISTRO.get(clave)


def marcas_registradas() -> dict[str, Marca]:
    """Devuelve una copia del registro (útil para diagnósticos y tests)."""
    return dict(_REGISTRO)
