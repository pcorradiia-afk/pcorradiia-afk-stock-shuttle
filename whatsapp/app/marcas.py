"""Registro multi-marca y multi-línea: la "tabla de configuración" del sistema.

Hay DOS dimensiones de enrutamiento:

  1) Marca / empresa  (Ford·Pedro Corradi, Toyota·Sapac, ...)
  2) Línea de negocio (Planes de ahorro, Venta de 0km, Posventa/Taller)

Cada número de WhatsApp de Twilio (el parámetro `To` del webhook) representa una
``Cuenta``: una marca + las líneas que ese número atiende.

  - Si el número atiende UNA sola línea  → contexto directo (ruteo automático).
  - Si atiende VARIAS líneas             → el bot muestra un menú de líneas y
                                            recuerda la elección del cliente.

El "comportamiento" (prompt de IA, asesor a quien derivar, plantillas) vive en
``ConfigLinea``, porque eso es lo que cambia según la línea. La identidad de la
marca (empresa, marca comercial, horario) vive en ``Marca``.

En la Fase 1 todo esto es un diccionario en memoria. En la Fase 2 la misma
forma se puede leer desde Supabase o Google Sheets sin tocar el resto del
código: lo único que importa es que ``buscar_cuenta(To)`` devuelva una Cuenta.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .core.normalizacion import normalizar_telefono

# --- Líneas de negocio (constantes para evitar errores de tipeo) ---
LINEA_PLANES = "planes"
LINEA_VENTAS = "ventas"
LINEA_POSVENTA = "posventa"

# Etiqueta legible para los menús.
ETIQUETA_LINEA: dict[str, str] = {
    LINEA_PLANES: "Planes de ahorro",
    LINEA_VENTAS: "Venta de 0km",
    LINEA_POSVENTA: "Posventa / Taller",
}


@dataclass(frozen=True)
class HorarioAtencion:
    """Ventana de atención de una concesionaria (hora local de la marca)."""

    apertura: int = 9          # Hora de apertura (0-23)
    cierre: int = 18           # Hora de cierre (0-23)
    dias_laborables: tuple[int, ...] = (0, 1, 2, 3, 4, 5)  # lunes=0 ... sábado=5


@dataclass(frozen=True)
class Marca:
    """Identidad de una marca/empresa del grupo (no depende de la línea)."""

    id_empresa: str            # Identificador interno (coincide con la carpeta /data)
    empresa: str               # Razón social de la concesionaria
    marca: str                 # Marca comercial que representa
    saludo: str                # Nombre con el que el bot se presenta
    horario: HorarioAtencion = field(default_factory=HorarioAtencion)
    anio_desde: int | None = None        # Año de fundación (para el saludo de marca)
    menu_opciones: tuple[str, ...] = ()  # Menú de bienvenida personalizado (con emoji)


@dataclass(frozen=True)
class Plantilla:
    """Una plantilla aprobada (HSM) de WhatsApp.

    La imagen del encabezado y los botones de respuesta rápida son parte de la
    plantilla aprobada en Twilio/Meta; acá los declaramos para saber qué espera
    y para poder mostrarlos en la simulación.
    """

    sid: str                            # content_sid real en Twilio (HX...)
    opciones: tuple[str, ...] = ()       # botones de respuesta rápida del cliente
    tiene_imagen: bool = False           # ¿la plantilla lleva imagen en el encabezado?
    tiene_documento: bool = False        # ¿la plantilla lleva un PDF/documento adjunto?


@dataclass(frozen=True)
class ConfigLinea:
    """Comportamiento de UNA línea de negocio dentro de una marca."""

    linea: str                 # LINEA_PLANES | LINEA_VENTAS | LINEA_POSVENTA
    system_prompt: str         # Identidad de la IA para esta marca + línea
    vendedor_derivacion: str   # A quién avisar cuando piden un asesor humano
    plantillas: dict[str, "Plantilla"] = field(default_factory=dict)


@dataclass(frozen=True)
class Cuenta:
    """Lo que representa un número de WhatsApp: una marca y sus líneas activas."""

    marca: Marca
    lineas: dict[str, ConfigLinea]  # clave = constante de línea


@dataclass(frozen=True)
class Contexto:
    """Par resuelto (marca × línea) que fluye por toda la lógica del bot.

    Expone atributos de conveniencia para que el enrutador, la IA y la
    derivación no tengan que saber de la estructura interna.
    """

    marca: Marca
    cfg: ConfigLinea

    @property
    def empresa(self) -> str:
        return self.marca.empresa

    @property
    def nombre_marca(self) -> str:
        return self.marca.marca

    @property
    def saludo(self) -> str:
        return self.marca.saludo

    @property
    def horario(self) -> HorarioAtencion:
        return self.marca.horario

    @property
    def linea(self) -> str:
        return self.cfg.linea

    @property
    def etiqueta_linea(self) -> str:
        return ETIQUETA_LINEA.get(self.cfg.linea, self.cfg.linea)

    @property
    def system_prompt(self) -> str:
        return self.cfg.system_prompt

    @property
    def vendedor_derivacion(self) -> str:
        return self.cfg.vendedor_derivacion

    @property
    def plantillas(self) -> dict[str, "Plantilla"]:
        return self.cfg.plantillas


# =====================================================================
#  Helpers para construir el prompt de IA por (marca × línea) sin repetir texto
# =====================================================================
def _prompt(linea: str, marca: str, saludo: str) -> str:
    base = (
        f"Sos el asistente virtual de {saludo}, concesionario oficial {marca}. "
        "Hablás en español rioplatense, de forma breve, amable y profesional. "
        "Nunca inventás precios ni stock; si no sabés algo, ofrecés derivar a un asesor."
    )
    especifico = {
        LINEA_PLANES: (
            " Atendés EXCLUSIVAMENTE planes de ahorro: estado de cuotas, "
            "adjudicaciones, licitaciones y entrega de unidades. Para ayudar pedí "
            "el número de grupo y orden."
        ),
        LINEA_VENTAS: (
            f" Atendés VENTA DE 0KM {marca}. Calificás el lead detectando: "
            "(1) el modelo de interés, (2) si entrega un usado en parte de pago y "
            "(3) la forma de pago (contado, financiado o plan de ahorro)."
        ),
        LINEA_POSVENTA: (
            " Atendés POSVENTA y TALLER: turnos de service, estado de reparaciones "
            "y encuestas de calidad. Para ayudar pedí modelo, patente y kilometraje."
        ),
    }
    return base + especifico[linea]


def _cfg(linea: str, marca: str, saludo: str, vendedor: str,
         plantillas: dict[str, Plantilla] | None = None) -> ConfigLinea:
    return ConfigLinea(
        linea=linea,
        system_prompt=_prompt(linea, marca, saludo),
        vendedor_derivacion=vendedor,
        plantillas=plantillas or {},
    )


# --- Marcas (identidad) ---
_PEDRO = Marca(
    id_empresa="empresa_pedro_corradi",
    empresa="Pedro Corradi S.A.",
    marca="Ford",
    saludo="Pedro Corradi",
    # Horario AMPLIO para pruebas (siempre "abierto"). Ajustar al real por
    # sucursal cuando salgamos a producción, p. ej. HorarioAtencion(9, 18).
    horario=HorarioAtencion(apertura=0, cierre=24, dias_laborables=(0, 1, 2, 3, 4, 5, 6)),
    anio_desde=1925,
    menu_opciones=(
        "🚙 Comprar un 0km",
        "💳 Plan Óvalo",
        "🔁 Consultar por usados",
        "⚙️ Repuestos",
        "🔧 Taller",
    ),
)
_SAPAC = Marca(
    id_empresa="empresa_sapac",
    empresa="Sapac S.A.",
    marca="Toyota",
    saludo="Sapac",
    horario=HorarioAtencion(apertura=8, cierre=17),
)


# =====================================================================
#  REGISTRO DE CUENTAS
#  Clave = número de WhatsApp de Twilio (E.164 limpio).
#  Refleja el escenario MIXTO que definimos:
#    - un número dedicado a una sola línea (ruteo directo), y
#    - un número que atiende varias líneas (el bot pregunta).
# =====================================================================
_REGISTRO: dict[str, Cuenta] = {
    # Pedro Corradi · número DEDICADO a Planes de Ahorro (una sola línea).
    "+5493510000001": Cuenta(
        marca=_PEDRO,
        lineas={
            LINEA_PLANES: _cfg(
                LINEA_PLANES, "Ford", "Pedro Corradi",
                "Equipo de Planes de Ahorro Pedro Corradi",
                {
                    "adjudicacion_plan": Plantilla("HX11_planes_aaaa"),
                    "cupon_pago": Plantilla("HX11_planes_cccc", tiene_documento=True),
                },
            ),
        },
    ),
    # Pedro Corradi · número COMPARTIDO entre Ventas 0km y Posventa (varias líneas).
    "+5493510000002": Cuenta(
        marca=_PEDRO,
        lineas={
            LINEA_VENTAS: _cfg(
                LINEA_VENTAS, "Ford", "Pedro Corradi",
                "Equipo comercial 0km Pedro Corradi",
                {
                    "difusion_stock": Plantilla(
                        "HX11_v_difu",
                        opciones=("Me interesa", "Ver financiación", "Hablar con asesor"),
                        tiene_imagen=True,
                    ),
                },
            ),
            LINEA_POSVENTA: _cfg(
                LINEA_POSVENTA, "Ford", "Pedro Corradi",
                "Equipo de Posventa Pedro Corradi",
                {
                    "encuesta_calidad": Plantilla(
                        "HX11_pv_bbbb",
                        opciones=("1", "2", "3", "4", "5"),
                    ),
                },
            ),
        },
    ),
    # Sapac · número ÚNICO que atiende las tres líneas (varias líneas).
    "+5493510000003": Cuenta(
        marca=_SAPAC,
        lineas={
            LINEA_PLANES: _cfg(
                LINEA_PLANES, "Toyota", "Sapac",
                "Equipo de Planes de Ahorro Sapac",
                {
                    "adjudicacion_plan": Plantilla("HX22_planes_aaaa"),
                    "cupon_pago": Plantilla("HX22_planes_cccc", tiene_documento=True),
                },
            ),
            LINEA_VENTAS: _cfg(
                LINEA_VENTAS, "Toyota", "Sapac",
                "Equipo comercial 0km Sapac",
                {
                    "difusion_stock": Plantilla(
                        "HX22_v_difu",
                        opciones=("Me interesa", "Ver financiación", "Hablar con asesor"),
                        tiene_imagen=True,
                    ),
                },
            ),
            LINEA_POSVENTA: _cfg(
                LINEA_POSVENTA, "Toyota", "Sapac",
                "Equipo de Posventa Sapac",
                {
                    "encuesta_calidad": Plantilla(
                        "HX22_pv_bbbb",
                        opciones=("1", "2", "3", "4", "5"),
                    ),
                },
            ),
        },
    ),
}


def buscar_cuenta(numero_destino: str) -> Cuenta | None:
    """Encuentra la Cuenta a partir del número `To` que llega del webhook."""
    return _REGISTRO.get(normalizar_telefono(numero_destino))


def lineas_de(cuenta: Cuenta) -> list[str]:
    """Lista ordenada de las líneas que atiende una cuenta."""
    return list(cuenta.lineas.keys())


def contexto_de(cuenta: Cuenta, linea: str) -> Contexto | None:
    """Resuelve el par (marca × línea) en un Contexto, o None si no aplica."""
    cfg = cuenta.lineas.get(linea)
    if cfg is None:
        return None
    return Contexto(marca=cuenta.marca, cfg=cfg)


def buscar_por_empresa(id_empresa: str, linea: str) -> tuple[str, Contexto] | None:
    """Búsqueda inversa para el envío saliente: empresa + línea → (número, contexto).

    El envío de campañas necesita el número de WhatsApp DESDE el cual mandar
    (el `From`) y el contexto (para resolver la plantilla aprobada). Recorre el
    registro buscando la cuenta de esa empresa que atienda esa línea.
    """
    for numero, cuenta in _REGISTRO.items():
        if cuenta.marca.id_empresa == id_empresa and linea in cuenta.lineas:
            return numero, Contexto(marca=cuenta.marca, cfg=cuenta.lineas[linea])
    return None


def cuentas_registradas() -> dict[str, Cuenta]:
    """Devuelve una copia del registro (útil para diagnósticos y tests)."""
    return dict(_REGISTRO)


def registrar_numero_prueba(numero: str, id_empresa: str, linea: str) -> Cuenta:
    """Mapea un número de prueba (ej. el Sandbox de Twilio) a una marca/línea.

    Reutiliza la identidad y la configuración de línea de una empresa ya
    registrada, sin tocar el código. Lo llama main.py al arrancar si hay un
    Sandbox configurado en el .env.
    """
    encontrado = buscar_por_empresa(id_empresa, linea)
    if encontrado is None:
        raise ValueError(
            f"No puedo mapear el número de prueba: la empresa '{id_empresa}' no "
            f"atiende la línea '{linea}'."
        )
    _, ctx = encontrado
    clave = normalizar_telefono(numero)
    cuenta = Cuenta(marca=ctx.marca, lineas={linea: ctx.cfg})
    _REGISTRO[clave] = cuenta
    return cuenta


def empresas_con_linea(linea: str) -> list[str]:
    """Lista (sin repetir) de empresas que atienden una línea dada.

    Lo usa el scheduler para saber a qué empresas enviarles encuestas.
    """
    empresas: list[str] = []
    for cuenta in _REGISTRO.values():
        id_empresa = cuenta.marca.id_empresa
        if linea in cuenta.lineas and id_empresa not in empresas:
            empresas.append(id_empresa)
    return empresas
