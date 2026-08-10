"""Cerebro del Súper Asesor "Tomás" (ventas Pedro Corradi): prompt + fuentes.

Los archivos viven en ``whatsapp/conocimiento/tomas/`` para poder actualizarlos
sin tocar código (las bases de Financiación y Plan Óvalo son circulares
MENSUALES: se reemplaza el archivo del mes y listo). El prompt v5.14 es el
system prompt; las bases se le anexan como FUENTES — la regla rectora es que
el bot solo afirma producto/financiación/plan desde ahí.

El checklist de calidad y la arquitectura NO se cargan al bot (son material
interno del equipo): viven en ``whatsapp/docs/tomas/``.

Si los archivos no están, ``prompt_tomas()`` devuelve None y la línea de
ventas cae al prompt corto de siempre (el bot nunca queda mudo).
"""

from __future__ import annotations

from pathlib import Path

_DIR = Path(__file__).resolve().parent.parent / "conocimiento" / "tomas"

_ARCHIVO_PROMPT = "prompt_activacion_bot_super_asesor_v5_14.md"

# Orden de las fuentes tal como las referencia el prompt (producto primero).
_FUENTES = (
    ("MATRIZ DE EQUIPAMIENTO (gama completa)", "matriz_equipamiento_gama_completa.md"),
    ("BASE DE FINANCIACIÓN ICBC (mes vigente)", "base_financiacion_icbc_julio_2026.md"),
    ("BASE PLAN ÓVALO (mes vigente)", "base_conocimiento_plan_ovalo_julio_2026.md"),
    ("BASE APP FORD", "base_conocimiento_app_ford.md"),
)

_cache: str | None = None
_cache_listo = False


def prompt_tomas() -> str | None:
    """System prompt completo de Tomás: prompt v5.14 + fuentes anexadas.

    Se lee del disco una sola vez por proceso (los archivos solo cambian con
    un deploy, así que cachear es seguro y evita I/O en cada mensaje).
    """
    global _cache, _cache_listo
    if _cache_listo:
        return _cache
    _cache_listo = True

    ruta_prompt = _DIR / _ARCHIVO_PROMPT
    if not ruta_prompt.is_file():
        print(f"⚠️  [TOMÁS] No encuentro {ruta_prompt.name}; uso el prompt corto.")
        return None

    partes = [ruta_prompt.read_text(encoding="utf-8").strip()]
    partes.append(
        "\n\n# ═══════════ FUENTES (archivos del proyecto) ═══════════\n"
        "Estas son tus ÚNICAS fuentes de producto, financiación y plan de "
        "ahorro. Si un dato no está acá, no lo inventás: lo derivás."
    )
    for titulo, nombre in _FUENTES:
        ruta = _DIR / nombre
        if ruta.is_file():
            cuerpo = ruta.read_text(encoding="utf-8").strip()
            partes.append(f"\n\n## ▸ FUENTE: {titulo}\n\n{cuerpo}")
        else:
            print(f"⚠️  [TOMÁS] Falta la fuente {nombre} (sigo sin ella).")

    _cache = "\n".join(partes)
    print(
        f"🧠 [TOMÁS] Prompt v5.14 cargado con {len(partes) - 2} fuentes "
        f"({len(_cache):,} caracteres)."
    )
    return _cache
