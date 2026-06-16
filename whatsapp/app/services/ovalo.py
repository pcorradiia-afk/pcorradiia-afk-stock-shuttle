"""Importador y campañas del Plan Óvalo desde el CSV mensual de la concesionaria.

La base del Óvalo es DINÁMICA (cambia cada mes). Por eso no se guarda una copia:
se sube el CSV del mes al momento de la campaña, el sistema lo lee fresco, deja
ELEGIR a quién enviar (por modelo y/o situación) y arma el mensaje.

El CSV viene del sistema del Óvalo, separado por ';', con estas columnas clave:
APELLIDO Y NOMBRE · CELULAR / TELEFONO_PARTICULAR / TELEFONO_LABORAL · NRO_GRUPO ·
NRO_ORDEN · MODELO (código) · STATUS_DESC (situación del plan).

Los datos reales NUNCA se guardan en el repositorio: se procesan en memoria.
"""

from __future__ import annotations

import csv
import io
from dataclasses import dataclass, field

from ..core import rate_limit
from ..core.normalizacion import normalizar_telefono
from ..marcas import LINEA_PLANES, buscar_por_empresa
from .twilio_client import enviar_plantilla

# Mapeo de códigos de MODELO del Óvalo → nombre comercial (se completa con el
# cliente; lo que no esté acá se muestra con su código tal cual).
MODELOS: dict[str, str] = {
    # "R120F": "Ranger",
    # "R120G": "Ranger",
    # "MAV02": "Maverick",
    # ...
}


@dataclass
class ClienteOvalo:
    nombre: str
    telefono: str          # normalizado a +549..., o "" si no tiene
    grupo: str
    orden: str
    modelo_codigo: str
    modelo: str            # nombre comercial si está mapeado, si no el código
    status: str            # STATUS_DESC


def parsear_csv(contenido: bytes) -> list[ClienteOvalo]:
    """Parsea el CSV del Óvalo (bytes) a una lista de clientes normalizados."""
    texto = contenido.decode("utf-8-sig", errors="replace")
    lector = csv.DictReader(io.StringIO(texto), delimiter=";")
    clientes: list[ClienteOvalo] = []
    for fila in lector:
        nombre = _nombre_lindo(fila.get("APELLIDO Y NOMBRE", ""))
        if not nombre:
            continue  # fila vacía (relleno de Excel)
        codigo = (fila.get("MODELO") or "").strip()
        clientes.append(
            ClienteOvalo(
                nombre=nombre,
                telefono=_mejor_telefono(fila),
                grupo=(fila.get("NRO_GRUPO") or "").strip(),
                orden=(fila.get("NRO_ORDEN") or "").strip(),
                modelo_codigo=codigo,
                modelo=MODELOS.get(codigo, codigo),
                status=(fila.get("STATUS_DESC") or "").strip() or "Sin estado",
            )
        )
    return clientes


def analizar(clientes: list[ClienteOvalo]) -> dict:
    """Resumen para armar el selector: totales y opciones de filtro con conteo."""
    con_tel = [c for c in clientes if c.telefono]

    def _conteo(clave) -> list[dict]:
        cont: dict[str, int] = {}
        for c in con_tel:
            cont[clave(c)] = cont.get(clave(c), 0) + 1
        return [
            {"valor": v, "cantidad": n}
            for v, n in sorted(cont.items(), key=lambda x: -x[1])
        ]

    return {
        "total": len(clientes),
        "con_telefono": len(con_tel),
        "sin_telefono": len(clientes) - len(con_tel),
        "modelos": _conteo(lambda c: c.modelo),
        "situaciones": _conteo(lambda c: c.status),
    }


def filtrar(
    clientes: list[ClienteOvalo],
    modelos: list[str] | None = None,
    situaciones: list[str] | None = None,
) -> list[ClienteOvalo]:
    """Aplica el selector: deja sólo los que tienen teléfono y matchean los filtros.

    Si una lista de filtro está vacía o es None, no filtra por ese criterio
    (= "todos"). Los filtros son por el NOMBRE de modelo y por la situación.
    """
    seleccion = [c for c in clientes if c.telefono]
    if modelos:
        seleccion = [c for c in seleccion if c.modelo in modelos]
    if situaciones:
        seleccion = [c for c in seleccion if c.status in situaciones]
    return seleccion


@dataclass
class ResultadoOvalo:
    telefono: str
    nombre: str
    estado: str            # "enviado" | "simulado" | "duplicado" | "error"
    detalle: str = ""
    vista_previa: str = ""


@dataclass
class ReporteOvalo:
    id_empresa: str
    campania: str
    modo: str
    seleccionados: int
    enviados: int = 0
    simulados: int = 0
    duplicados: int = 0
    errores: int = 0
    resultados: list[ResultadoOvalo] = field(default_factory=list)


def correr(
    id_empresa: str,
    campania: str,
    clientes: list[ClienteOvalo],
    cuerpo_preview: str,
    plantilla_logica: str | None = None,
    imagen_url: str | None = None,
    dry_run: bool = True,
) -> ReporteOvalo:
    """Envía (o simula) la campaña a la selección de clientes ya filtrada.

    `cuerpo_preview` es el texto con placeholders {nombre} {modelo} {grupo} {orden}
    para mostrar qué le llega a cada uno. En envío real se usa la plantilla
    aprobada (`plantilla_logica`); en simulación sólo se arma la vista previa.
    """
    from ..config import obtener_config

    encontrado = buscar_por_empresa(id_empresa, LINEA_PLANES)
    if encontrado is None:
        raise ValueError(f"La empresa '{id_empresa}' no tiene línea de Planes.")
    numero_origen, ctx = encontrado

    config = obtener_config()
    content_sid = ctx.plantillas.get(plantilla_logica).sid if (
        plantilla_logica and ctx.plantillas.get(plantilla_logica)
    ) else None
    usar_twilio = (
        not dry_run
        and bool(config.twilio_account_sid and config.twilio_auth_token)
        and content_sid is not None
    )

    reporte = ReporteOvalo(
        id_empresa=id_empresa,
        campania=campania,
        modo="real" if usar_twilio else "simulado",
        seleccionados=len(clientes),
    )

    for c in clientes:
        if rate_limit.ya_enviado(id_empresa, campania, c.telefono):
            reporte.duplicados += 1
            reporte.resultados.append(
                ResultadoOvalo(c.telefono, c.nombre, "duplicado", "ya recibió en 24 hs")
            )
            continue

        preview = _render(cuerpo_preview, c)
        try:
            if usar_twilio:
                variables = _armar_variables(c, imagen_url)
                sid = enviar_plantilla(c.telefono, numero_origen, content_sid, variables)
                reporte.enviados += 1
                reporte.resultados.append(
                    ResultadoOvalo(c.telefono, c.nombre, "enviado", sid, preview)
                )
            else:
                reporte.simulados += 1
                reporte.resultados.append(
                    ResultadoOvalo(c.telefono, c.nombre, "simulado", "dry-run", preview)
                )
            rate_limit.registrar_envio(id_empresa, campania, c.telefono)
        except Exception as exc:  # noqa: BLE001
            reporte.errores += 1
            reporte.resultados.append(
                ResultadoOvalo(c.telefono, c.nombre, "error", str(exc), preview)
            )

    return reporte


# --- Helpers ---
def _mejor_telefono(fila: dict) -> str:
    for col in ("CELULAR", "TELEFONO_PARTICULAR", "TELEFONO_LABORAL"):
        valor = (fila.get(col) or "").strip()
        if valor:
            return normalizar_telefono(valor)
    return ""


def _nombre_lindo(apellido_nombre: str) -> str:
    return " ".join((apellido_nombre or "").split()).title()


def _render(plantilla_texto: str, c: ClienteOvalo) -> str:
    datos = {"nombre": c.nombre, "modelo": c.modelo, "grupo": c.grupo, "orden": c.orden}
    try:
        return plantilla_texto.format_map(_Defecto(datos))
    except Exception:  # noqa: BLE001
        return plantilla_texto


def _armar_variables(c: ClienteOvalo, imagen_url: str | None) -> dict[str, str]:
    # {{1}} imagen (si hay), luego nombre, modelo, grupo, orden.
    valores = ([imagen_url] if imagen_url else []) + [c.nombre, c.modelo, c.grupo, c.orden]
    return {str(i + 1): str(v) for i, v in enumerate(valores)}


class _Defecto(dict):
    def __missing__(self, _clave: str) -> str:
        return ""
