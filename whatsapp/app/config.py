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

    # --- Persistencia (Supabase, opcional) ---
    # Es backend: se usa la service_role key (secreta), NUNCA la anon del frontend.
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # --- Scheduler (envíos automáticos) ---
    scheduler_activo: bool = True        # arrancar el scheduler con la app
    scheduler_intervalo_min: int = 60    # cada cuántos minutos revisar encuestas
    # Si está en True, el scheduler SIMULA los envíos (seguro). Poné False en
    # producción para que mande de verdad.
    encuestas_dry_run: bool = True

    # --- Sandbox de Twilio (para la primera prueba real) ---
    # Mapeá el número del Sandbox a una marca/línea sin tocar el código.
    sandbox_numero: str = ""             # ej: +14155238886 (te lo da Twilio)
    sandbox_empresa: str = ""            # ej: empresa_pedro_corradi
    sandbox_linea: str = "ventas"        # planes | ventas | posventa

    # --- Horarios ---
    tz_defecto: str = "America/Argentina/Buenos_Aires"

    @property
    def usar_supabase(self) -> bool:
        """True si hay credenciales de Supabase para persistir los datos."""
        return bool(self.supabase_url and self.supabase_service_role_key)


@lru_cache
def obtener_config() -> Configuracion:
    """Devuelve la configuración (cacheada) para inyectarla en toda la app."""
    return Configuracion()
