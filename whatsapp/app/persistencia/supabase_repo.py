"""Repositorio sobre Supabase (PostgreSQL en la nube).

Usa el SDK oficial `supabase` con la **service_role key** (es backend, server-side
y secreta — nunca va al frontend). Las tablas llevan prefijo `wsp_` para no
chocar con el esquema del frontend. El SQL para crearlas está en
`whatsapp/supabase/schema.sql`.

Si todavía no instalaste el SDK (`pip install supabase`) o no configuraste las
credenciales, la app usa el RepositorioMemoria y este módulo ni se importa.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from .base import Repositorio

_VENTANA_HORAS = 24


class RepositorioSupabase(Repositorio):
    def __init__(self, url: str, service_role_key: str) -> None:
        # Import diferido: sólo se necesita el SDK cuando Supabase está activo.
        from supabase import create_client

        self._db = create_client(url, service_role_key)

    # --- Rate limit (ventana de 24 hs) ---
    def campania_ya_enviada(self, id_empresa: str, campania: str, telefono: str) -> bool:
        desde = (datetime.now(timezone.utc) - timedelta(hours=_VENTANA_HORAS)).isoformat()
        res = (
            self._db.table("wsp_campania_envios")
            .select("id")
            .eq("id_empresa", id_empresa)
            .eq("campania", campania)
            .eq("telefono", telefono)
            .gte("enviado_at", desde)
            .limit(1)
            .execute()
        )
        return bool(res.data)

    def registrar_campania(self, id_empresa: str, campania: str, telefono: str) -> None:
        self._db.table("wsp_campania_envios").insert(
            {
                "id_empresa": id_empresa,
                "campania": campania,
                "telefono": telefono,
                "enviado_at": datetime.now(timezone.utc).isoformat(),
            }
        ).execute()

    # --- Sesión: línea ---
    def linea_elegida(self, numero_cuenta: str, telefono: str) -> str | None:
        res = (
            self._db.table("wsp_sesiones")
            .select("linea")
            .eq("numero_cuenta", numero_cuenta)
            .eq("telefono", telefono)
            .limit(1)
            .execute()
        )
        return res.data[0]["linea"] if res.data else None

    def fijar_linea(self, numero_cuenta: str, telefono: str, linea: str) -> None:
        self._db.table("wsp_sesiones").upsert(
            {
                "numero_cuenta": numero_cuenta,
                "telefono": telefono,
                "linea": linea,
                "actualizado_at": datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="numero_cuenta,telefono",
        ).execute()

    def olvidar_linea(self, numero_cuenta: str, telefono: str) -> None:
        (
            self._db.table("wsp_sesiones")
            .delete()
            .eq("numero_cuenta", numero_cuenta)
            .eq("telefono", telefono)
            .execute()
        )

    # --- Derivación: bot pausado ---
    def bot_pausado(self, telefono: str) -> bool:
        res = (
            self._db.table("wsp_bot_pausado")
            .select("telefono")
            .eq("telefono", telefono)
            .limit(1)
            .execute()
        )
        return bool(res.data)

    def pausar_bot(self, telefono: str) -> None:
        self._db.table("wsp_bot_pausado").upsert(
            {"telefono": telefono, "pausado_at": datetime.now(timezone.utc).isoformat()},
            on_conflict="telefono",
        ).execute()

    def reactivar_bot(self, telefono: str) -> None:
        self._db.table("wsp_bot_pausado").delete().eq("telefono", telefono).execute()

    # --- Encuestas: dedupe ---
    def encuesta_enviada(self, id_empresa: str, telefono: str, fecha_evento: str) -> bool:
        res = (
            self._db.table("wsp_encuesta_envios")
            .select("id")
            .eq("id_empresa", id_empresa)
            .eq("telefono", telefono)
            .eq("fecha_evento", fecha_evento)
            .limit(1)
            .execute()
        )
        return bool(res.data)

    def marcar_encuesta_enviada(self, id_empresa: str, telefono: str, fecha_evento: str) -> None:
        self._db.table("wsp_encuesta_envios").insert(
            {"id_empresa": id_empresa, "telefono": telefono, "fecha_evento": fecha_evento}
        ).execute()

    # --- Encuestas: abierta ---
    def abrir_encuesta(self, numero_cuenta: str, telefono: str, contexto: dict) -> None:
        self._db.table("wsp_encuestas_abiertas").upsert(
            {
                "numero_cuenta": numero_cuenta,
                "telefono": telefono,
                "id_empresa": contexto.get("id_empresa"),
                "tipo": contexto.get("tipo"),
                "referencia": contexto.get("referencia"),
                "abierta_at": datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="numero_cuenta,telefono",
        ).execute()

    def encuesta_abierta(self, numero_cuenta: str, telefono: str) -> dict | None:
        res = (
            self._db.table("wsp_encuestas_abiertas")
            .select("id_empresa,tipo,referencia")
            .eq("numero_cuenta", numero_cuenta)
            .eq("telefono", telefono)
            .limit(1)
            .execute()
        )
        return res.data[0] if res.data else None

    def cerrar_encuesta(self, numero_cuenta: str, telefono: str) -> None:
        (
            self._db.table("wsp_encuestas_abiertas")
            .delete()
            .eq("numero_cuenta", numero_cuenta)
            .eq("telefono", telefono)
            .execute()
        )

    # --- Encuestas: resultados ---
    def guardar_resultado(self, resultado: dict) -> None:
        self._db.table("wsp_encuesta_resultados").insert(resultado).execute()

    def resultados(self, id_empresa: str) -> list[dict]:
        res = (
            self._db.table("wsp_encuesta_resultados")
            .select("*")
            .eq("id_empresa", id_empresa)
            .order("fecha")
            .execute()
        )
        return res.data or []

    # --- Memoria conversacional ---
    def historial(self, numero_cuenta: str, telefono: str) -> list[dict]:
        res = (
            self._db.table("wsp_historial")
            .select("rol,contenido")
            .eq("numero_cuenta", numero_cuenta)
            .eq("telefono", telefono)
            .order("id", desc=True)
            .limit(16)
            .execute()
        )
        filas = list(reversed(res.data or []))  # de más viejo a más nuevo
        return [{"role": f["rol"], "content": f["contenido"]} for f in filas]

    def agregar_historial(
        self, numero_cuenta: str, telefono: str, rol: str, contenido: str
    ) -> None:
        self._db.table("wsp_historial").insert(
            {
                "numero_cuenta": numero_cuenta,
                "telefono": telefono,
                "rol": rol,
                "contenido": contenido,
            }
        ).execute()

    # --- Tests ---
    def limpiar_todo(self) -> None:
        # No se borra la base real desde el código de la app a propósito.
        raise NotImplementedError("limpiar_todo no está disponible en Supabase.")
