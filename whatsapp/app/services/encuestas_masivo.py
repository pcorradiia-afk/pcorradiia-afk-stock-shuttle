"""Envío masivo de encuestas desde el Excel del sistema interno (Calidad).

Lee el Excel exportado de "Encuestas Internas" y manda la encuesta (plantilla
aprobada) SOLO a las que están **pendiente** o **no_logra_contactar**. NO toca
"completada" (ya la hizo) ni "rechazada" (el cliente no quiere, es válido).

La base NO se guarda: se procesa en memoria al momento (datos reales).

Columnas esperadas del Excel (export de Calidad):
A=OR · B=Fecha entrega · C=Sucursal · D=Cliente · E=Teléfono · F=Vehículo ·
G=Patente · H=Status encuesta · (resto: puntajes/clasificación, no se usan acá).
"""

from __future__ import annotations

import io
from dataclasses import dataclass, field

from ..core import rate_limit
from ..core.normalizacion import normalizar_telefono

# Estados que SÍ se envían (el resto se ignora).
ENVIABLES = {"pendiente", "no_logra_contactar"}
_ID_EMPRESA = "empresa_pedro_corradi"
_CAMPANIA = "encuesta_taller"


@dataclass
class FilaEncuesta:
    orden: str
    cliente: str
    telefono: str       # normalizado a +549..., o "" si no tiene
    vehiculo: str
    patente: str
    status: str         # en minúscula
    sucursal: str

    @property
    def referencia(self) -> str:
        return " ".join(x for x in (self.vehiculo, self.patente) if x).strip() or "tu vehículo"

    @property
    def enviable(self) -> bool:
        return self.status in ENVIABLES and bool(self.telefono)


def parsear_excel(contenido: bytes) -> list[FilaEncuesta]:
    """Parsea el Excel del sistema interno a una lista de filas."""
    import openpyxl

    wb = openpyxl.load_workbook(io.BytesIO(contenido), read_only=True, data_only=True)
    ws = wb.active
    filas: list[FilaEncuesta] = []
    for i, r in enumerate(ws.iter_rows(values_only=True)):
        if i == 0 or not r or r[0] in (None, ""):
            continue  # encabezado o fila vacía
        filas.append(
            FilaEncuesta(
                orden=str(r[0]).strip() if r[0] is not None else "",
                cliente=_titulo(r[3]) if len(r) > 3 else "",
                telefono=normalizar_telefono(str(r[4])) if len(r) > 4 and r[4] else "",
                vehiculo=(str(r[5]).strip() if len(r) > 5 and r[5] else ""),
                patente=(str(r[6]).strip() if len(r) > 6 and r[6] else ""),
                status=(str(r[7]).strip().lower() if len(r) > 7 and r[7] else ""),
                sucursal=(str(r[2]).strip() if len(r) > 2 and r[2] else ""),
            )
        )
    return filas


def analizar(filas: list[FilaEncuesta]) -> dict:
    """Resumen para el panel: total, conteo por status y cuántas se enviarían."""
    por_status: dict[str, int] = {}
    for f in filas:
        por_status[f.status or "(vacío)"] = por_status.get(f.status or "(vacío)", 0) + 1
    enviables = sum(1 for f in filas if f.enviable)
    sin_tel = sum(1 for f in filas if f.status in ENVIABLES and not f.telefono)
    return {
        "total": len(filas),
        "por_status": por_status,
        "enviables": enviables,
        "sin_telefono": sin_tel,
        "no_se_envian": sum(1 for f in filas if f.status not in ENVIABLES),
    }


@dataclass
class ResultadoEnvioMasivo:
    telefono: str
    cliente: str
    estado: str
    detalle: str = ""


@dataclass
class ReporteMasivo:
    modo: str
    total: int
    enviables: int
    enviadas: int = 0
    simuladas: int = 0
    duplicadas: int = 0
    omitidas: int = 0
    errores: int = 0
    resultados: list[ResultadoEnvioMasivo] = field(default_factory=list)


def enviar(filas: list[FilaEncuesta], dry_run: bool = True) -> ReporteMasivo:
    """Envía (o simula) la encuesta a las filas 'pendiente'/'no_logra_contactar'."""
    from ..config import obtener_config
    from .integracion import recibir_evento

    config = obtener_config()
    usar_twilio = (not dry_run) and bool(config.twilio_account_sid and config.twilio_auth_token)
    reporte = ReporteMasivo(
        modo="real" if usar_twilio else "simulado",
        total=len(filas),
        enviables=sum(1 for f in filas if f.enviable),
    )

    for f in filas:
        if f.status not in ENVIABLES:
            reporte.omitidas += 1
            continue
        if not f.telefono:
            reporte.errores += 1
            reporte.resultados.append(ResultadoEnvioMasivo("?", f.cliente, "error", "sin teléfono"))
            continue
        if rate_limit.ya_enviado(_ID_EMPRESA, _CAMPANIA, f.telefono):
            reporte.duplicadas += 1
            reporte.resultados.append(
                ResultadoEnvioMasivo(f.telefono, f.cliente, "duplicada", "ya recibió en 24 hs")
            )
            continue

        evento = {
            "tipo": "servicio",
            "id_externo": f.orden,
            "cliente": f.cliente,
            "telefono": f.telefono,
            "referencia": f.referencia,
            "sucursal": f.sucursal,
            "empresa": _ID_EMPRESA,
        }
        res = recibir_evento(evento, dry_run=dry_run)
        estado = res.get("estado", "error")
        if estado == "enviada":
            reporte.enviadas += 1
            rate_limit.registrar_envio(_ID_EMPRESA, _CAMPANIA, f.telefono)
        elif estado == "simulada":
            reporte.simuladas += 1
        else:
            reporte.errores += 1
        reporte.resultados.append(
            ResultadoEnvioMasivo(f.telefono, f.cliente, estado, res.get("detalle", ""))
        )

    return reporte


def _titulo(valor) -> str:
    return " ".join(str(valor or "").split()).title()
