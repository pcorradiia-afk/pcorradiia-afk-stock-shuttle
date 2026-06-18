"""Interfaz del repositorio: el contrato que cumplen memoria y Supabase.

Agrupa todo el estado que necesita sobrevivir (o no) entre mensajes:
  - rate limit de campañas (no reenviar en 24 hs),
  - línea elegida en la sesión (números multi-línea),
  - pausa del bot por derivación humana,
  - encuestas (dedupe de envío, encuesta abierta esperando respuesta, resultados).
"""

from __future__ import annotations

from abc import ABC, abstractmethod


class Repositorio(ABC):
    """Contrato de persistencia. Lo implementan memoria y Supabase."""

    # --- Rate limit de campañas (ventana de 24 hs) ---
    @abstractmethod
    def campania_ya_enviada(self, id_empresa: str, campania: str, telefono: str) -> bool: ...

    @abstractmethod
    def registrar_campania(self, id_empresa: str, campania: str, telefono: str) -> None: ...

    # --- Sesión: línea elegida (números multi-línea) ---
    @abstractmethod
    def linea_elegida(self, numero_cuenta: str, telefono: str) -> str | None: ...

    @abstractmethod
    def fijar_linea(self, numero_cuenta: str, telefono: str, linea: str) -> None: ...

    @abstractmethod
    def olvidar_linea(self, numero_cuenta: str, telefono: str) -> None: ...

    # --- Derivación: bot pausado ---
    @abstractmethod
    def bot_pausado(self, telefono: str) -> bool: ...

    @abstractmethod
    def pausar_bot(self, telefono: str) -> None: ...

    @abstractmethod
    def reactivar_bot(self, telefono: str) -> None: ...

    # --- Encuestas: dedupe de envío ---
    @abstractmethod
    def encuesta_enviada(self, id_empresa: str, telefono: str, fecha_evento: str) -> bool: ...

    @abstractmethod
    def marcar_encuesta_enviada(self, id_empresa: str, telefono: str, fecha_evento: str) -> None: ...

    # --- Encuestas: encuesta abierta esperando respuesta ---
    @abstractmethod
    def abrir_encuesta(self, numero_cuenta: str, telefono: str, contexto: dict) -> None: ...

    @abstractmethod
    def encuesta_abierta(self, numero_cuenta: str, telefono: str) -> dict | None: ...

    @abstractmethod
    def cerrar_encuesta(self, numero_cuenta: str, telefono: str) -> None: ...

    # --- Encuestas: resultados (el tablero) ---
    @abstractmethod
    def guardar_resultado(self, resultado: dict) -> None: ...

    @abstractmethod
    def resultados(self, id_empresa: str) -> list[dict]: ...

    # --- Encuestas: cuestionario editable (preguntas por empresa) ---
    @abstractmethod
    def obtener_config_encuestas(self, id_empresa: str) -> dict | None: ...

    @abstractmethod
    def guardar_config_encuestas(self, id_empresa: str, datos: dict) -> None: ...

    # --- Memoria conversacional (historial de la charla con la IA) ---
    @abstractmethod
    def historial(self, numero_cuenta: str, telefono: str) -> list[dict]: ...

    @abstractmethod
    def agregar_historial(
        self, numero_cuenta: str, telefono: str, rol: str, contenido: str
    ) -> None: ...

    # --- Conversaciones: listar los chats (para el buzón del equipo) ---
    @abstractmethod
    def listar_conversaciones(self, numero_cuenta: str) -> list[dict]: ...

    # --- Conversaciones: área asignada (Ventas / Taller / Repuestos / Planes) ---
    @abstractmethod
    def fijar_area(self, numero_cuenta: str, telefono: str, area: str) -> None: ...

    @abstractmethod
    def area_de(self, numero_cuenta: str, telefono: str) -> str | None: ...

    # --- Utilitario para tests ---
    @abstractmethod
    def limpiar_todo(self) -> None: ...

    # --- Reiniciar una conversación puntual (simulador / "resetear este chat") ---
    @abstractmethod
    def reiniciar_conversacion(self, numero_cuenta: str, telefono: str) -> None: ...
