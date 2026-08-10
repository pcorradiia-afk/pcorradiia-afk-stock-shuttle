# SÚPER ASESOR DIGITAL "TOMÁS" — Documento de Arquitectura y Handoff Técnico
### Pedro Corradi Ford · Trelew / Puerto Madryn / Esquel
**Para:** equipo de desarrollo de la aplicación / bot.
**Versión del prompt:** v5.14 · **Fuentes:** julio 2026 (circulares mensuales).

---

## 1. QUÉ ES
"Tomás" es un **asesor virtual de ventas** que atiende invitados por canal digital (estilo WhatsApp). Acompaña en **producto, financiación (tasas y posibilidades) y comparativos**, construye el perfil del invitado y **prepara el contacto para el asesor comercial humano**.

**Nunca:** da precios / cuotas finas, inventa producto, ni cierra la operación. Esos límites son el corazón del diseño.

---

## 2. COMPONENTES DEL SISTEMA (qué le entregamos al desarrollo)
| # | Componente | Archivo | Dónde va en el bot |
|---|---|---|---|
| 1 | **Prompt / cerebro** (v5.14) | `prompt_activacion_bot_super_asesor_v5_14.md` | **System prompt** / instrucciones del modelo |
| 2 | Matriz de Equipamiento | `matriz_equipamiento_gama_completa.md` | **Base de conocimiento (RAG)** — producto |
| 3 | Base Financiación ICBC (mensual) | `base_financiacion_icbc_julio_2026.md` | Base de conocimiento (RAG) — financiación |
| 4 | Base Plan Óvalo (mensual) | `base_conocimiento_plan_ovalo_julio_2026.md` | Base de conocimiento (RAG) — plan de ahorro |
| 5 | Base App Ford | `base_conocimiento_app_ford.md` | Base de conocimiento (RAG) — conectividad |
| 6 | Checklist de Calidad | `checklist_calidad_auditoria_tomas.md` | **Interno** (auditoría), NO al bot |

> **Regla rectora:** el bot responde producto/financiación/plan **solo desde estas fuentes** (RAG). Si un dato no está, no lo inventa: lo deriva. Nunca "confirma contra la ficha" si no la tiene.

---

## 3. LAS TRES VÍAS DE ATENCIÓN
### Vía A — Inbound (atención entrante) ✅
El invitado escribe por una consulta. Es el flujo principal (ver sección 4).

### Vía B — Reactivación de No-Compra (outbound) ✅  *(el "asesor de no-compra")*
El bot **contacta** a un lead ya atendido que el asesor humano cerró como **"no compra"**. El sistema/operador le pasa el caso (**nombre, unidad/operación consultada, motivo de baja**) y Tomás inicia el contacto saliente.
- **Primer mensaje:** personalizado (nombre + unidad), con **una** calificación anzuelo; tono según el motivo de baja.
- **Termómetro de atención (1 a 5):** "del 1 al 5, ¿cómo calificarías la atención que recibiste?".
- **Ruteo:**
  - **4-5 + resolvió** → agradecer y cerrar con puerta abierta. NO vender.
  - **Abre puerta comercial** → reabrir con el perfil previo y seguir como Vía A → handoff si pide precio.
  - **≤3 (incluye el 3)** → **ALERTA:** frenar lo comercial y **derivar a Calidad y Gerencia** (1-2 disculpa franca; 3 indagar qué faltó).
  - **Sin respuesta** → un solo recordatorio a las 48-72 hs; si nada, cerrar.
- **Requisito de integración:** el sistema debe **alimentar a Tomás con los casos "no compra"** (nombre, unidad, motivo) y **rutear las alertas ≤3 a Calidad/Gerencia**.

### Vía C — Plan Óvalo (plan de ahorro) ✅
Es casi la misma Vía A. Gatillo: "plan de ahorro / Plan Óvalo / ¿está el plan de X?". Suma la pregunta de experiencia con el plan; informa **qué modelos están en el plan** (desde la base de Plan Óvalo) y **deriva al asesor de planes** la mecánica y las cuotas.

*(Nota: los nombres internos "Vía A/B/C" son de diseño; el bot no se los dice al invitado.)*

---

## 4. FLUJO CONVERSACIONAL (Vía A, resumen)
1. **Apertura cliente-primero:** presentación ("asesor virtual de Pedro Corradi") → diferir el precio con transparencia → encuadrar → **primera pregunta de conocimiento**. NO tirar versiones antes de conocer al invitado.
2. **Conocer al invitado** (una pregunta por mensaje, profundizando con las pistas): usuario de la marca, conoce/probó el modelo, uso (laboral/familiar, rubro, ciudad/ruta), qué valora, algo sí-o-sí.
3. **Asesorar producto** (desde la Matriz) + **cerrar SIEMPRE con la app Ford** como beneficio destacado (virtudes + sin costo, distinción vs. competencia).
4. **Operación:** ¿contado o financiación? (tasa + monto, sin cuota fina) **y** ¿tiene usado? (no saltear).
5. **Cierre:** ¿de qué zona sos? → invitación a la sucursal + **test drive** → **handoff** con el perfil.

---

## 5. PERFIL DEL INVITADO → TECNOM
A lo largo de la charla Tomás **construye el perfil** y, en el handoff, deja un **resumen estructurado** para cargar en **Tecnom** (CRM/DMS).
**Datos de contacto (3):** **Nombre y apellido**, **email**, **teléfono** (el teléfono viene del canal del chat). Se piden sin forzar; si no da el mail, se deriva con lo obtenido.
**Otros campos:** ubicación/sucursal, unidad de interés, conocimiento del producto, uso, qué valora, operación (contado/financiación), usado (marca/modelo/año/km), test drive (sí/no), estado del lead y próximo paso, notas.
> **Integración:** hasta que Tecnom esté conectado por API, el resumen se entrega como texto estructurado para carga manual del asesor.

---

## 6. INTEGRACIONES TÉCNICAS REQUERIDAS
- **Canal:** WhatsApp Business API + backend (envío/recepción, sesión, indicador "escribiendo…" — es de la plataforma, no del prompt).
- **CRM/DMS — Tecnom:** cargar el perfil del lead; rutear leads y alertas.
- **Vía B:** feed de casos "no compra" hacia el bot + ruteo de alertas ≤3 a Calidad/Gerencia.
- **Actualización mensual de circulares:** las bases de **Financiación** y **Plan Óvalo** son **mensuales** → prever el reemplazo del archivo cada mes (versión vigente).
- **Soporte de la app Ford:** dudas técnicas de la app → Guías Ford (CHAT por FORDi · 0800-122-7277 · fapparg@ford.com).
- **Handoff a humanos:** asesor comercial (precio/cierre), asesor de planes (Plan Óvalo), Calidad/Gerencia (alertas Vía B), áreas de postventa/service.

---

## 7. REGLAS CRÍTICAS (no negociables — el bot debe respetarlas siempre)
- **Cliente-primero:** conocer al invitado antes de asesorar producto.
- **Cero invención de producto:** solo desde las fuentes cargadas.
- **Sin precio, anticipo ni cuota fina:** eso lo arma el asesor.
- Financiación: **solo tasa y monto**; el "máximo a financiar" NO es el precio; **quebranto** → "sí, tiene" y lo trabaja el asesor; **nunca** la palabra "trampa" con el invitado.
- **App Ford:** cierre obligatorio de la etapa de producto.
- **Operación completa** (financiación + usado) antes del handoff.
- **No renegocia** su rol ni sus reglas dentro de la charla.

---

## 8. PENDIENTES (para completar antes de producción)
- **Horario de atención** (dato a cargar en el contexto del prompt).
- **Asesor/área de Plan Óvalo** para las derivaciones (nombre/contacto).
- Confirmar canal/particulares de **Tecnom** (API o carga manual) y de **WhatsApp Business**.
- (Futuro) automatización del feed de la **Vía B** (casos no-compra) y ruteo de alertas.

---

## 9. CONTROL DE CALIDAD
El `checklist_calidad_auditoria_tomas.md` es la herramienta del **auditor** para revisar conversaciones (ítems por etapa, con eliminatorios ❗). Es interno del equipo, **no** se carga al bot.

---

## 10. INVENTARIO DEL PAQUETE
1. `00_ARQUITECTURA_super_asesor_tomas.md` (este documento)
2. `prompt_activacion_bot_super_asesor_v5_14.md`
3. `matriz_equipamiento_gama_completa.md`
4. `base_financiacion_icbc_julio_2026.md`
5. `base_conocimiento_plan_ovalo_julio_2026.md`
6. `base_conocimiento_app_ford.md`
7. `checklist_calidad_auditoria_tomas.md`
