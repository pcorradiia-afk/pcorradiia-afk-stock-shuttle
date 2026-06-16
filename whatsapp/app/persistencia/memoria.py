"""Repositorio en memoria: el comportamiento por defecto (Fase 1).

Replica exactamente la lógica que antes vivía en cada servicio. Los datos no
sobreviven a un reinicio: es ideal para desarrollo y pruebas. En producción se
usa el RepositorioSupabase.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from .base import Repositorio

_VENTANA = timedelta(hours=24)
# Cuántos mensajes del historial se recuerdan (idas y vueltas con la IA).
_MAX_HISTORIAL = 16


class RepositorioMemoria(Repositorio):
    def __init__(self) -> None:
        self._campanias: dict[tuple[str, str, str], datetime] = {}
        self._lineas: dict[tuple[str, str], str] = {}
        self._bot_pausado: set[str] = set()
        self._encuestas_enviadas: set[tuple[str, str, str]] = set()
        self._encuestas_abiertas: dict[tuple[str, str], dict] = {}
        self._resultados: list[dict] = []
        self._historiales: dict[tuple[str, str], list[dict]] = {}

    # --- Rate limit ---
    def campania_ya_enviada(self, id_empresa: str, campania: str, telefono: str) -> bool:
        momento = self._campanias.get((id_empresa, campania, telefono))
        if momento is None:
            return False
        return datetime.now(timezone.utc) - momento < _VENTANA

    def registrar_campania(self, id_empresa: str, campania: str, telefono: str) -> None:
        self._campanias[(id_empresa, campania, telefono)] = datetime.now(timezone.utc)

    # --- Sesión: línea ---
    def linea_elegida(self, numero_cuenta: str, telefono: str) -> str | None:
        return self._lineas.get((numero_cuenta, telefono))

    def fijar_linea(self, numero_cuenta: str, telefono: str, linea: str) -> None:
        self._lineas[(numero_cuenta, telefono)] = linea

    def olvidar_linea(self, numero_cuenta: str, telefono: str) -> None:
        self._lineas.pop((numero_cuenta, telefono), None)

    # --- Derivación ---
    def bot_pausado(self, telefono: str) -> bool:
        return telefono in self._bot_pausado

    def pausar_bot(self, telefono: str) -> None:
        self._bot_pausado.add(telefono)

    def reactivar_bot(self, telefono: str) -> None:
        self._bot_pausado.discard(telefono)

    # --- Encuestas: dedupe ---
    def encuesta_enviada(self, id_empresa: str, telefono: str, fecha_evento: str) -> bool:
        return (id_empresa, telefono, fecha_evento) in self._encuestas_enviadas

    def marcar_encuesta_enviada(self, id_empresa: str, telefono: str, fecha_evento: str) -> None:
        self._encuestas_enviadas.add((id_empresa, telefono, fecha_evento))

    # --- Encuestas: abierta ---
    def abrir_encuesta(self, numero_cuenta: str, telefono: str, contexto: dict) -> None:
        self._encuestas_abiertas[(numero_cuenta, telefono)] = dict(contexto)

    def encuesta_abierta(self, numero_cuenta: str, telefono: str) -> dict | None:
        return self._encuestas_abiertas.get((numero_cuenta, telefono))

    def cerrar_encuesta(self, numero_cuenta: str, telefono: str) -> None:
        self._encuestas_abiertas.pop((numero_cuenta, telefono), None)

    # --- Encuestas: resultados ---
    def guardar_resultado(self, resultado: dict) -> None:
        self._resultados.append(dict(resultado))

    def resultados(self, id_empresa: str) -> list[dict]:
        return [r for r in self._resultados if r.get("id_empresa") == id_empresa]

    # --- Memoria conversacional ---
    def historial(self, numero_cuenta: str, telefono: str) -> list[dict]:
        return list(self._historiales.get((numero_cuenta, telefono), []))

    def agregar_historial(
        self, numero_cuenta: str, telefono: str, rol: str, contenido: str
    ) -> None:
        hist = self._historiales.setdefault((numero_cuenta, telefono), [])
        hist.append({"role": rol, "content": contenido})
        if len(hist) > _MAX_HISTORIAL:
            del hist[: len(hist) - _MAX_HISTORIAL]

    # --- Tests ---
    def limpiar_todo(self) -> None:
        self._campanias.clear()
        self._lineas.clear()
        self._bot_pausado.clear()
        self._encuestas_enviadas.clear()
        self._encuestas_abiertas.clear()
        self._resultados.clear()
        self._historiales.clear()
