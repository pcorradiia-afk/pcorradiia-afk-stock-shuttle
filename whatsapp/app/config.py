"""Configuración global del servicio, leída desde variables de entorno.

Usamos pydantic-settings para que toda la configuración sensible (tokens, keys)
viva en el archivo .env y NUNCA en el código. Si falta una variable, el valor
por defecto definido acá permite que la app arranque igual en modo demo.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuracion(BaseSettings):
    """Variables de entorno del puente de WhatsApp."""

    # Pydantic carga automáticamente desde el archivo .env de esta carpeta.
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Twilio ---
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_validar_firma: bool = False

    # --- IA (Claude) ---
    ia_activa: bool = False
    anthropic_api_key: str = ""
    ia_modelo: str = "claude-opus-4-8"

    # --- Horarios ---
    tz_defecto: str = "America/Argentina/Buenos_Aires"


@lru_cache
def obtener_config() -> Configuracion:
    """Devuelve la configuración (cacheada) para inyectarla en toda la app."""
    return Configuracion()
