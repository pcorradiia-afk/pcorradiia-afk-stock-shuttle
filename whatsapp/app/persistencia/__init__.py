"""Capa de persistencia conmutable.

Toda la lógica de negocio (rate limit, sesiones, pausas de bot, encuestas) habla
con un `Repositorio` abstracto, sin saber si los datos viven en memoria o en
Supabase. La elección es automática según la configuración:

  - Si hay SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY  → RepositorioSupabase.
  - Si no                                            → RepositorioMemoria.

Así la app funciona igual con o sin base, y migrar a la nube no toca el resto
del código.
"""

from __future__ import annotations

from functools import lru_cache

from ..config import obtener_config
from .base import Repositorio
from .memoria import RepositorioMemoria


@lru_cache
def obtener_repo() -> Repositorio:
    """Devuelve el repositorio (singleton) según la configuración."""
    config = obtener_config()
    if config.usar_supabase:
        # Import diferido: sólo se necesita el SDK de Supabase si está activo.
        from .supabase_repo import RepositorioSupabase

        print("🗄️  [PERSISTENCIA] Usando Supabase")
        return RepositorioSupabase(config.supabase_url, config.supabase_service_role_key)

    print("🗄️  [PERSISTENCIA] Usando memoria (los datos no sobreviven reinicios)")
    return RepositorioMemoria()


__all__ = ["Repositorio", "obtener_repo"]
