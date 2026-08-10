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

    # --- Acceso al panel (clave simple) ---
    # Si quedan vacíos, el panel está abierto (modo prueba). Completalos para
    # exigir usuario + contraseña al entrar.
    panel_usuario: str = ""
    panel_clave: str = ""
    # Usuarios adicionales del panel (varios), formato: "user:clave,user2:clave2".
    # Se suman al usuario simple de arriba. Cargalos en Render (no en el código).
    panel_usuarios: str = ""

    # --- Integración con el sistema interno (in-house) ---
    # Token que el sistema interno debe enviar en la cabecera X-API-Token para
    # usar /eventos. Si queda vacío, el endpoint está abierto (sólo para probar).
    api_token: str = ""
    # URL del sistema interno a la que devolvemos el resultado de la encuesta
    # (writeback). Si queda vacía, no se hace writeback (sólo se guarda local).
    writeback_url: str = ""
    # Token que enviamos al sistema interno en el writeback (Authorization: Bearer).
    writeback_token: str = ""

    # --- Horarios ---
    tz_defecto: str = "America/Argentina/Buenos_Aires"

    # --- Horario de envío de encuestas (cómodo para el cliente) ---
    # Lunes a Viernes y Sábados (Domingo no se envía). Formato "HH:MM".
    envio_lv_desde: str = "09:00"
    envio_lv_hasta: str = "17:30"
    envio_sab_desde: str = "09:30"
    envio_sab_hasta: str = "12:45"

    @property
    def usar_supabase(self) -> bool:
        """True si hay credenciales de Supabase para persistir los datos."""
        return bool(self.supabase_url and self.supabase_service_role_key)


@lru_cache
def obtener_config() -> Configuracion:
    """Devuelve la configuración (cacheada) para inyectarla en toda la app."""
    return Configuracion()
