# CLAUDE.md — Sistema de Gestión y Seguimiento de Planes de Ahorro (Grupo Corradi)

> **Memoria del proyecto.** Este archivo resume el contrato del sistema: stack, modelo de
> datos, roles, reglas de negocio críticas, matriz de permisos, plan de fases y estado de
> avance. Se actualiza en **cada fase**. Si algo entra en conflicto con el código, manda este
> archivo hasta que se resuelva la diferencia.

---

## 0. Estado de avance

| Fase | Descripción | Estado |
|---|---|---|
| **Planificación** | Plan de fases, modelo de datos, matriz de permisos | ✅ **Entregado (este archivo) — pendiente de aprobación del cliente** |
| Fase 0 | Base: Next.js + Supabase, login, multiempresa, usuarios/roles, super admin, impersonar | ✅ **Hecho (modo demo)** — app Next.js funcionando, login, selector de empresa, usuarios, matriz de roles e impersonar; esquema SQL + RLS listos en `supabase/`. Falta conectar Supabase real. |
| Fase 1 | Núcleo: ficha cliente, bitácora, importación Ford, unicidad DNI/N° solicitud, asignación a vendedor | ✅ **Hecho (modo demo)** — listado de ahorristas con filtros, ficha + **bitácora** cronológica, alta de lead con **documento único** (sugiere el existente), **importación de LOS 5 ARCHIVOS del sistema actual** con detección automática de tipo (2026-07-02, pedido del cliente): **Novedades** (cartera, upsert por N° solicitud/grupo+orden), **Adjudicatarios sin pedido** (→ estadio Pedido con aging/observaciones/puede-pedir), **Ganadores de acto** (→ Adjudicación + alerta a Administración; soporta UTF-16/32), **cta_cte** (posicional 82 chars → módulo Cuenta corriente con resumen por concepto y export) y **adh** (posicional 269 chars, layout empírico BETA → enriquece domicilio/localidad/provincia/CP de clientes existentes; teléfono omitido por ambigüedad — pedir diseño de registro, N5). Falta backend real y remapeo manual de columnas. |
| Fase 2 | Ventas: recepción, vendedor, presupuestos, planes, cierre, reasignación, supervisión | ✅ **Hecho (modo demo)** — **catálogo de planes** (ABM), **asignación/reasignación** de vendedor, **gestión comercial** del vendedor (prueba de manejo, necesidades, plan, presupuesto), **cierre de venta** con datos obligatorios (DNI/CUIT + tel + email + N° solicitud) que pasa el caso a Administración (scoring), y **tablero de supervisión de ventas** (por vendedor, efectividad, leads pendientes). |
| Fase 3 | Administración por estadios (Scoring → … → Entrega) | 🟡 **Parcial (modo demo)** — panel de **estadios** en la ficha, **Scoring** con resultados y **alertas** (campanita + /alertas) al observar, **gestión de la observación** por Sup. de ventas, formularios de Adjudicación/Pedido/Patentamiento/Entrega, **avance entre estadios**, accesos por `acceso_estadio` y restricción **terciarizada**. Pendiente: reglas de **Agrupamiento** (N3/§6.2, hoy mínimo) y el **motor de cálculo** de patentamiento/requisitos (N1). |
| Fase 4 | Campañas y notificaciones por WhatsApp | ⬜ No iniciado |
| Fase 5 | Informes, tableros gerenciales, exportaciones, auditoría completa | 🟡 **Parcial (modo demo)** — página **/informes** con filtros (fecha de alta, vendedor, estado), KPIs, **embudo por estadio**, **ventas y efectividad por vendedor**, **observaciones de scoring** (abiertas + tiempo de resolución promedio) y **exportación a Excel** (ahorristas y scoring; también desde el listado de ahorristas). **Tablero** con datos reales. Pendiente: auditoría completa (log de acciones) e informes por sucursal/equipo cuando haya datos reales multi-equipo. |

> **Decisión del cliente (2026-06-24):** este sistema se construye como **proyecto separado**
> en la subcarpeta `planes-ahorro/`, sin tocar el sistema existente "Grupo Fiorasi · Control &
> Gestión" que vive en la raíz del repositorio. Stack **Next.js**. Login **único con cambio de
> empresa** (una empresa por vez; **sin vista consolidada** — los ahorristas de cada empresa son
> clientes distintos, decisión 2026-06-25).

---

## 1. Propósito del sistema

Reemplazar al sistema de terceros (SIGNOS Gestión) en lo que hace al seguimiento de
**clientes ahorristas** de Plan Óvalo Ford para dos concesionarias del grupo:

| Empresa | CUIT | Nombre comercial |
|---|---|---|
| **PEDRO CORRADI SA** (S.A.C.I.F.I. y E.) | **33-52033241-9** | Pedro Corradi |
| **SAPAC SA** | **30-59970938-6** | **Fiorasi** |

El corazón del sistema es:
1. **Ficha del cliente/ahorrista** con sus datos y su solicitud Ford.
2. **Bitácora (anotador)** de todas las comunicaciones con cada cliente, a lo largo de un
   proceso por etapas.
3. **Importación** de los ahorristas desde el Excel que exporta Ford (Plan Óvalo). El sistema
   **no** se conecta por API a Ford: el usuario descarga el Excel y lo sube.

---

## 2. Stack tecnológico (decidido)

- **Frontend + Backend:** Next.js (App Router, TypeScript). API routes para webhooks de
  WhatsApp e importación de Excel del lado servidor.
- **Base de datos + Auth + Permisos:** Supabase (PostgreSQL + Supabase Auth + **Row Level
  Security**). El aislamiento por empresa/terciarizada se implementa con RLS real, no
  ocultando botones.
- **UI:** Tailwind CSS + shadcn/ui. Diseño sobrio, profesional, pensado para uso intensivo de
  oficina (tablas, filtros, formularios claros).
- **Importación de Excel:** SheetJS (`xlsx`).
- **Despliegue:** Vercel (app) + Supabase (datos, región São Paulo `sa-east-1`).
- **Idioma:** español argentino en toda la interfaz, mensajes, botones y datos.

---

## 3. Modelo de datos (PostgreSQL / Supabase)

> Nomenclatura: tablas en `snake_case`, en español. Toda fila operativa lleva `empresa_id`
> (y cuando corresponde `gestion_id` para terciarizadas) para que RLS pueda aislar datos.

### 3.1 Organización y acceso
- **empresa** — `id`, `nombre` (Pedro Corradi / SAPAC), `cuit`, `activo`.
- **sucursal** — `id`, `empresa_id`, `nombre`, `activo`.
- **equipo** — `id`, `sucursal_id`, `nombre`, `tipo` (`ventas` | `administracion`).
- **usuario** (`profiles`, 1:1 con Supabase Auth) — `id`(=auth.uid), `nombre`, `email`,
  `empresa_id`, `sucursal_id`, `equipo_id`, `tipo_perfil` (`concesionario` |
  `terciarizada`), `activo`. Para login único multiempresa, los accesos cruzados se modelan
  con **membresia_empresa** (ver abajo).
- **membresia_empresa** — `usuario_id`, `empresa_id`, `alcance` (`empresa` | `grupo`). Permite
  que un usuario (ej. super admin / gerencia) opere varias empresas con un único login.
- **rol** — catálogo de roles funcionales (ver §4.2).
- **usuario_rol** — `usuario_id`, `rol_id`, `empresa_id` (un usuario puede tener rol acotado
  por empresa).
- **acceso_estadio** — `usuario_id`, `estadio` (enum). Define a qué estadios de administración
  accede cada usuario de administración (el super admin lo asigna). Ver §6.

### 3.2 Comercial / cliente
- **cliente** (ahorrista — entidad central) — `id`, `empresa_id`, `gestion_id` (nullable; para
  terciarizadas), `nombre_completo`, `documento` (DNI o CUIT, **ÚNICO** — ver §3.6),
  `tipo_documento`, `telefono`, `email`, `origen_dato`, `vendedor_id`, `estadio_actual`,
  `estado` (`lead` | `vendido` | `gestionado` | …), `nacido_como` (`lead_interno` |
  `importado_ford`), `fecha_alta`.
- **solicitud** — `id`, `cliente_id`, `empresa_id`, `nro_solicitud` (**ÚNICO E IRREPETIBLE** —
  ver §3.6), `tipo_solicitud`, `carga`, `modelo`, `plan_id`, `debito_automatico`,
  `medio_pago`, `status_ford`, `fecha_carga`, `fecha_envio`, `fecha_ultimo_envio`.
- **comunicacion** (bitácora / anotador) — `id`, `cliente_id`, `usuario_id`, `fecha_hora`,
  `tipo_contacto`, `detalle` (lo conversado), `proxima_accion`, `estadio`. Se visualiza como
  **historial cronológico por cliente**.
- **presupuesto** — `id`, `cliente_id`, `archivo_url`, `subido_por`, `fecha`.
- **plan** — catálogo de planes (precargado por admin; el vendedor elige de la lista).
  `id`, `empresa_id`, `nombre`, `modelo`, `activo`.

### 3.3 Estadios / scoring
- **observacion_scoring** — `id`, `cliente_id`, `fecha_hora`, `usuario_id`, `resultado`
  (enum: `observado_requisitos_crediticios` | `observado_gastos_retiro` |
  `observado_vehiculo_usado` | `observado_presupuesto` | `observado_otros` | `aprobado` |
  `pendiente`), `gestion_resultado`, `gestion_fecha_hora`, `gestion_usuario_id`.
- **estadio_registro** — registros propios de cada estadio (agrupamiento, gestión de cliente,
  adjudicación, pedido, patentamiento, entrega). Diseño detallado por estadio en §6
  (Agrupamiento queda **A DEFINIR**).

### 3.4 Alertas y auditoría
- **alerta** — `id`, `usuario_destino_id`, `tipo`, `cliente_id`, `mensaje`, `leida`,
  `fecha`. (Campanita in-app; email queda preparado para más adelante.)
- **log_auditoria** — `id`, `usuario_id`, `accion`, `entidad`, `entidad_id`, `dato_anterior`
  (jsonb), `dato_nuevo` (jsonb), `fecha_hora`. Registra alta/baja/edición de usuarios, cambios
  de rol, corrección de N° solicitud, importaciones, cambios de estadio, envíos de campañas.

### 3.5 WhatsApp (Fase 4)
- **consentimiento_whatsapp** (opt-in) — `cliente_id`, `tiene_optin` (bool), `fecha_optin`,
  `canal_origen`. **Sin opt-in no se puede enviar.**
- **plantilla_whatsapp** — `id`, `nombre`, `categoria` (`marketing` | `utility` |
  `authentication`), `idioma`, `cuerpo` (con variables), `estado_aprobacion`.
- **campania_whatsapp** — `id`, `empresa_id`, `nombre`, `plantilla_id`, `segmento` (jsonb de
  filtros), `fecha_programada`, `estado`.
- **envio_whatsapp** — `id`, `campania_id`, `cliente_id`, `estado_entrega` (`enviado` |
  `entregado` | `leido` | `error`), `fecha`, `costo_estimado`.

### 3.6 Reglas de integridad innegociables
1. **Documento (DNI/CUIT) único por cliente** (constraint único por `empresa_id` o global — *a
   confirmar alcance*). Al intentar cargar uno existente, el sistema **no crea duplicado**:
   avisa y **sugiere el cliente ya existente** para sumar gestión sobre ese.
2. **N° de solicitud único e irrepetible**. Si se cargó mal, **solo el Supervisor de
   Administración** puede corregirlo, y la corrección queda en `log_auditoria`.
3. **Importación = upsert**, con dos fuentes distintas (ver §5.bis):
   - **Cartera (Novedades / ACTUALIZACION):** match por `nro_solicitud` y/o `grupo`+`orden`.
     **No** trae DNI → no se valida documento en esta importación.
   - **Solicitudes Plan Óvalo (§5):** match por `nro_solicitud` y `DNI`.
   - En ambos casos: si existe → actualiza; si no → crea. Nunca duplica.

---

## 4. Perfiles, roles y permisos

Hay **dos capas**: tipo de perfil de organización (capa de visibilidad / RLS) y rol funcional
(capa de acciones).

### 4.1 Tipo de perfil de organización (RLS)
- **Concesionario:** ve **todos** los clientes de su empresa.
- **Terciarizada:** ve y gestiona **solo los clientes de su propia gestión** (`gestion_id`),
  sin acceso al resto. Implementado con RLS real en Supabase.

### 4.2 Roles funcionales
- **Super Admin** — configura y controla todo: alta/baja de usuarios, roles, empresas,
  sucursales, equipos; asigna estadios de administración por usuario; **puede impersonar**.
- **Recepción** — ingresa leads y los asigna a un vendedor. Al ingresar un lead, **email y
  origen del dato son obligatorios**.
- **Vendedor** — gestiona leads asignados y propios: registra lo conversado, adjunta
  presupuesto, prueba de manejo (sí/no), necesidades, próxima acción; elige plan de la lista.
  **Para cerrar como vendido es obligatorio: DNI/CUIT + teléfono + email + N° de solicitud.**
- **Supervisor de ventas** — ve ventas de su equipo, **reasigna leads**, obtiene informes
  (ventas, efectividad, leads pendientes), gestiona observaciones de scoring de su equipo.
- **Administración** — sigue la gestión por **estadios** (el super admin define a cuáles
  accede). *Restricción terciarizada:* solo **informar agrupamiento** y **gestión de mora**.
- **Supervisor de administración** — recibe alertas, **corrige N° de solicitud**, supervisa la
  gestión administrativa.
- **Entregas** — gestiona la entrega del vehículo.
- **Analista de Suscripciones** *(rol de administración)* — destinatario de alertas de
  scoring observado.
- **Gerencia / Dirección (lectura)** *(rol inferido — a confirmar)* — acceso de solo lectura a
  tableros e informes del grupo. No figura explícito en el documento pero el cliente (Gerente
  General) necesita ver informes; se incluye para confirmar.

### 4.3 Matriz de permisos Rol × Acción

> Leyenda: **V** ver · **C** crear · **E** editar · **X** eliminar · **—** sin acceso.
> "Propio/equipo" = limitado a sus registros o a su equipo/empresa según RLS.
> Esta matriz se debe **confirmar antes de codear la seguridad (Fase 0)**.

| Acción / recurso | Super Admin | Recepción | Vendedor | Sup. Ventas | Administración | Sup. Admin. | Entregas | Analista Susc. | Gerencia (lectura) |
|---|---|---|---|---|---|---|---|---|---|
| Empresas / sucursales / equipos | V C E X | — | — | — | — | — | — | — | V |
| Usuarios (alta/baja/edición) | V C E X | — | — | — | — | — | — | — | — |
| Cambiar roles | V C E X | — | — | — | — | — | — | — | — |
| Asignar estadios a usuarios | V C E X | — | — | — | — | — | — | — | — |
| Impersonar usuarios | ✔ | — | — | — | — | — | — | — | — |
| Catálogo de planes | V C E X | V | V | V | V | V | — | — | V |
| Leads — crear | C | C | C (propio) | C | — | — | — | — | — |
| Leads — asignar a vendedor | E | E | — | E (equipo) | — | — | — | — | — |
| Leads — reasignar | E | — | — | E (equipo) | — | — | — | — | — |
| Ficha cliente — ver | V | V (empresa) | V (propio) | V (equipo) | V (estadios asignados) | V | V (entrega) | V (scoring) | V (lectura) |
| Ficha cliente — editar | E | E | E (propio) | E (equipo) | E (estadios asignados) | E | E (entrega) | — | — |
| Bitácora — crear/ver | V C | V C | V C (propio) | V C (equipo) | V C | V C | V C | V | V |
| Presupuesto — adjuntar | C | — | C (propio) | C (equipo) | — | — | — | — | — |
| Cerrar venta (marcar vendido) | E | — | E (propio, con datos obligatorios) | E (equipo) | — | — | — | — | — |
| N° de solicitud — corregir | E | — | — | — | — | **E** | — | — | — |
| Importar Excel de Ford | ✔ | — | — | — | ✔ | ✔ | — | — | — |
| Scoring — registrar resultado | E | — | — | — | C E | V | — | V | — |
| Gestionar observación de scoring | — | — | — | **C E (equipo)** | — | V | — | — | — |
| Estadio Agrupamiento | E | — | — | — | E* | V | — | — | — |
| Estadio Gestión de cliente / mora | E | — | — | — | E* | V | — | — | — |
| Estadio Adjudicación | E | — | — | — | E | V | — | — | — |
| Estadio Pedido | E | — | — | — | E | V | — | — | — |
| Estadio Patentamiento | E | — | — | — | E | V | — | — | — |
| Estadio Entrega | E | — | — | — | V | V | **C E** | — | — |
| Campañas WhatsApp — crear/enviar | C E | — | — | C (equipo) | C E | C E | — | — | — |
| Plantillas WhatsApp | V C E X | — | — | — | V | V | — | — | V |
| Informes / tableros | V (todo) | — | V (propio) | V (equipo) | V (estadios) | V (admin) | V (entregas) | — | V (grupo) |
| Auditoría (log) | V | — | — | — | — | V | — | — | V |

`*` Para **Administración de perfil terciarizada**: en estadios solo habilitar **Agrupamiento
(informar)** y **Gestión de mora**; el resto bloqueado por RLS/permiso.

---

## 5. Importación desde Ford "Plan Óvalo"

Módulo de importación con **vista previa, mapeo de columnas y validación**.

- **Columnas esperadas** (mapeo configurable; pueden variar): `Conce`, `Usuario`,
  `Nro. Solicitud`, `Tipo Solicitud`, `Carga`, `Fecha de carga`, `Fecha de envío`, `Fecha
  Último Envío`, `Nombre Completo`, `DNI`, `Status`, `Modelo`, `Débito Automático`, `Plan
  Arranque`, `Medio de Pago`.
- **Flujo:** subir archivo → vista previa → mapeo de columnas → validación → confirmación.
- **Match (upsert):** por N° de solicitud y DNI. Si existe → actualiza; si no → crea. Respeta
  unicidad de §3.6.
- **Empresa:** se elige al importar (Pedro Corradi o SAPAC) y se asigna a todas las filas.
- **Reporte de resultado:** creados / actualizados / rechazados (con motivo).
- **Auditoría:** quién, cuándo, archivo, cantidades.

> ✅ **Actualización (2026-06-25):** el cliente ya entregó archivos reales. Ver **§5.bis** para
> las columnas reales de la **cartera (Novedades)** y la **planilla de cálculo**. Las columnas
> "Plan Óvalo" de arriba quedan como segunda fuente posible, a confirmar (Q4).

---

## 5.bis. Archivos reales del cliente (analizados 2026-06-25) y lo que implican

> El cliente entregó dos archivos reales. Cambian/expanden el alcance del prompt original:
> **hay dos fuentes de importación distintas** y la planilla actual **no es solo datos: es un
> motor de cálculo** que el sistema debe absorber en los estadios de Adjudicación/Pedido/
> Patentamiento. Archivos pendientes que el cliente anunció: **lista de precios**, **movimiento
> de cada adherente** y **cuenta corriente**.

### 5.bis.1 `Novedades_NN.csv` — la CARTERA (fuente mensual desde FIS)
CSV separado por `;`. Es el listado completo de ahorristas tal como se baja de **FIS**. Es la
misma información que la solapa **ACTUALIZACION** de la planilla. ~1.049 filas en el ejemplo.
**Columnas reales:**
`ID_CONCESIONARIO; NOMBRE_CONCESIONARIO; APELLIDO Y NOMBRE; DOMICILIO; CODIGO_POSTAL;
TELEFONO_PARTICULAR; TELEFONO_LABORAL; CELULAR; EMAIL; NRO_SOLICITUD; NRO_GRUPO; NRO_ORDEN;
PLAN; MODELO; STATUS; STATUS_DESC; VALOR_MOVIL; DESVIO; ADELANTO; LICITO; PORCENTAJE;
FECHA_AGRUPO; FECHA_PRENDA; EMITIDAS; PAGA; IMPAGA; CUPON_ELECTRONICO; DEB_CRED`

- **`STATUS` / `STATUS_DESC`** son el estado del adherente en la cartera (códigos): `2`=AHORRISTA
  AL DIA, `4`=ADJUD DEF AL DIA, `9`=ADJUD PEND AL DIA, etc. → mapean al **estadio** del cliente.
- **Identificador del adherente = `NRO_GRUPO` + `NRO_ORDEN`** (la admin "concatena grupo/orden").
  También viene `NRO_SOLICITUD`.
- ⚠️ **Importante:** esta cartera **NO trae DNI/CUIT**. El DNI llega por el alta de lead/venta o
  por el export de Plan Óvalo. → La regla de unicidad por documento (§3.6) aplica al alta
  comercial; el **match de la cartera es por `nro_solicitud` y/o `grupo`+`orden`**, no por DNI.

### 5.bis.2 `Planilla de cálculo patentamiento (adjudicados).xls` — el MOTOR de cálculo
Workbook con 22 solapas. Las administrativas **solo completan las celdas amarillas**; el resto
se autocalcula. Solapas clave:

| Solapa | Qué es | Rol en el sistema |
|---|---|---|
| **ACTUALIZACION** | La cartera (igual que Novedades). Se pega mensual desde FIS. | Importación de cartera |
| **Modelo** | Catálogo de planes: `código_plan, %participación, descripción_modelo, valor_móvil, cuotas, financiación, bonificación`. Se cargan los códigos de planes nuevos. | Tabla **plan** (catálogo) |
| **Precio / Precio2** | Lista de precios: `modelo, versión, SEQ, valor_móvil_final` (+ alícuota, importado/nacional). Se actualiza manual cada mes. | Tabla **lista_precios** |
| **Bonific** | `código_plan → texto de bonificación`. | Atributo del plan |
| **req2** | Requisitos por plan (clave `tipo+%+cuotas`) + listado de documentación exigida. | Cálculo de **requisitos** (Adjudicación) |
| **Gastos de retiro** | Presupuesto de **patentamiento**: formularios, inscripción, **sellado por jurisdicción (Neuquén / Río Negro)**, patente. Valores de arancel editables (amarillo). Se imprime en **PDF** para el cliente. | Motor de **gastos de patentamiento** (Patentamiento) |
| **Licitación** | Cálculo para asesorar a quien quiere **licitar**. | Asesoramiento de licitación |
| **Pedido** | Orden de pedido de unidad: grupo, orden, acto de adjudicación, modelo del plan, modelo solicitado, caja, cabina, **SEQ**, colores, declaraciones. | **Hoja de pedido** imprimible (Pedido) |
| **Adjudicado** | Anexo "pasos de entrega". | Checklist de Entrega |
| **Hoja seguimiento / GESTORIA / PASE / Cancelado…** | Seguimiento, gestoría y variantes de pago. | Patentamiento / Entrega |

**Mantenimiento mensual del cliente (a replicar como carga del sistema):**
1. **Cartera** → pegar en ACTUALIZACION (en el sistema: importar Novedades).
2. **Precios** → actualizar valor de cada modelo (en el sistema: ABM de lista de precios).
3. **Modelo** → cargar códigos de planes nuevos con cuotas/financiación/bonificación.

**Implicancia de alcance:** la planilla cubre **Adjudicación, Pedido y Patentamiento** con
cálculos (requisitos, gastos de retiro por jurisdicción, táctico con diferencia de precio y
descuento en celdas verdes, generación de presupuesto PDF y hoja de pedido). Esto es trabajo
significativo y cae en **Fase 3** (estadios). Los **valores de arancel/sellado deben ser
parámetros editables por jurisdicción** (hoy Neuquén/Río Negro; dejar configurable).

### 5.bis.3 `Adjudicatarios_Sin_Pedido_*.csv` — lista de trabajo del estadio PEDIDO
CSV `sep=;`, con comillas. Adjudicados que **todavía no cargaron el pedido** (work-list para
admin/ventas). Columnas:
`NRO_GRUPO; NRO_ORDEN; GRUPO_ACTO_ADJUDICACION; ORDEN_ACTO_ADJUDICACION; APELLIDO Y NOMBRE;
STATUS; MODELO; ID_CONCESIONARIO; FECHA_ACEPTACION; REQ_CRED; REQ_CRED_ST; PLAN; PORC_AX;
RECHAZOS; VWC079_OBSERVACIONES; AGING; PUEDE_INGRESAR_PEDIDO (S/N)`
- `VWC079_OBSERVACIONES` (ej. "Adeuda Alícuota + Rq Cred") y `PUEDE_INGRESAR_PEDIDO` definen si
  el caso está habilitado para pedido → alimenta alertas y el tablero del estadio Pedido.
- `AGING` = días de antigüedad de la adjudicación sin pedido (priorización).

### 5.bis.4 `Ganadores_Acto_NN.csv` — ganadores de sorteo/licitación por acto
CSV `sep=;` **codificado en UTF-16** (ojo al importar: detectar encoding). Columnas:
`NRO_ACTO; NRO_GRUPO; NRO_ORDEN; GRUPO_ACTO_ADJUDICACION; ORDEN_ACTO_ADJUDICACION; APELLIDO Y
NOMBRE; STATUS; ID_CONCESIONARIO; PLAN; MODELO; TIPO_ADJUDICACION (ej. "Reemplazo Titular");
CONDICIONAL ("Titular"); IMPORTE_OFERTA`
- Es la fuente directa del caso de uso **"informar ganadores por sorteo"** (campaña WhatsApp) y
  del estadio **Adjudicación**.

### 5.bis.5 `cta_cte_*.txt` — cuenta corriente del concesionario con la administradora
Archivo de **ancho fijo / posicional** (un movimiento por línea). Estructura observada:
`concesionario(059432) | fecha(dd/mm/aaaa) | código_mov(3) | descripción(~33) | D|C |
importe con $ (signado) | clave grupo+orden (y/o solicitud)`. Códigos de movimiento vistos:
`ITP`=Incentivo X Plan, `ADJ`=Derecho Adjudic., `RPP`/`PPP`/`CPE`=prenda/penalizaciones,
`SXS`=Impuesto de Sellos, `GPS`=Gastos Prest. Serv., `F03`=Formularios 03.
- Es la **cta cte de la concesionaria con Plan Óvalo** (incentivos a favor, cargos en contra),
  no la cuenta del cliente. Útil para conciliación/finanzas; **no** es el saldo del ahorrista.

### 5.bis.6 `adh_NNNNNN.txt` — movimiento por adherente (posicional, ancho fijo)
Archivo de **ancho fijo** sin separadores. Cada línea trae, entremezclados: identificador,
importes (varios campos numéricos), `177` (concesionario), grupo, fecha (aammdd), un número
largo (identificador/CUIT), **código postal, domicilio, localidad, provincia, apellido y
nombre, teléfono**, más campos numéricos de saldo. Es la fuente más rica en **datos de contacto
y domicilio** del adherente.
- ⚠️ **Requiere la especificación del layout posicional** (posiciones exactas de cada campo)
  para parsearlo con seguridad. **Pedir al cliente el diseño de registro** o un archivo con
  cabeceras. Hasta tenerlo, no se implementa este import.

---

## 6. Flujo de trabajo y estadios

Orden: **Scoring de ventas → Agrupamiento → Gestión de cliente → Adjudicación → Pedido →
Patentamiento → Entrega.** El super admin define a qué estadio accede cada usuario de admin.

### 6.1 Scoring de ventas
- Registrar **fecha y hora** de llamados/registros.
- Resultados: *Observado por requisitos crediticios* · *Observado por gastos de retiro* ·
  *Observado por vehículo usado* · *Observado presupuesto* · *Observado por otros* ·
  *Aprobado* · *Pendiente*.
- Cualquier **"Observado"** dispara **alerta** a: **Analista de Suscripciones**, **Supervisor
  de Administración** y **Supervisor de Ventas del equipo**.
- El **Supervisor de Ventas** gestiona la observación (registra resultado con fecha y hora) →
  cliente pasa a **"Gestionado"** → vuelve a Administración (scoring) para recontactar.
- Administración puede volver a marcar "Observado…" o **Aprobado**.
- **Aprobado** → finaliza Scoring → pasa a **Agrupamiento**.

### 6.2 Agrupamiento — ⚠️ A DEFINIR (Q3)
El documento original quedó incompleto. **Preguntar al cliente** qué acciones/registros
necesita antes de implementar. Por ahora: estadio existente con **formulario mínimo**.

### 6.3 Gestión de cliente
Campañas de: **gestión de mora**, **invitación a licitar**, **informar ganadores por sorteo**,
**campañas especiales**.

### 6.4 Adjudicación
Informar al cliente sobre **requisitos crediticios** y **pagos a realizar**.

### 6.5 Pedido
Registrar **fecha**, **modelo solicitado** y **colores**.

### 6.6 Patentamiento
Registrar **fecha de factura** e instancias: *informe de gastos de retiro* · *cita para firma
de documentación* · *pase a gestoría* · *patentamiento finalizado*.

### 6.7 Entrega (rol Entregas)
Registrar **fecha de contacto** para coordinar turno · **registro del turno** · **cierre del
proceso**.

### 6.8 Restricción terciarizada
Administración de perfil **terciarizada**: solo **informar agrupamiento** y **gestión de
mora**.

---

## 7. Informes y tableros (Fase 5)

- Tablero **por empresa** (Pedro Corradi / Fiorasi). **No se consolida** entre empresas: los
  ahorristas son clientes distintos de cada empresa (decisión del cliente, 2026-06-25). Un
  usuario con acceso a ambas cambia de empresa con el selector, pero ve una por vez.
- Embudo por estadio · ventas por vendedor/equipo/sucursal · **efectividad (leads→ventas)** y
  leads pendientes · observaciones de scoring abiertas y tiempo de resolución.
- Filtros por fecha, empresa, sucursal, equipo, vendedor, estado.
- **Exportación de cualquier listado a Excel.**

> En Fase 1 alcanza con listados base.

---

## 8. Alertas y auditoría

- **Alertas in-app** (campanita) para los eventos descritos (ej. observación de scoring). Email
  queda **preparado pero opcional** para más adelante.
- **Auditoría:** alta/baja/edición de usuarios, cambios de rol, corrección de N° solicitud,
  importaciones y cambios de estadio. Cada registro con usuario, fecha/hora y dato
  anterior/nuevo.

---

## 9. WhatsApp (Fase 4)

- El sistema **no envía WhatsApp por su cuenta**: se integra vía API con un **proveedor BSP**
  (Twilio / 360dialog / Gupshup / WATI u otro). Conexión **configurable** por variables de
  entorno.
- Abstracción interna **`EnviadorWhatsApp`** con una implementación por proveedor → cambiar de
  proveedor no reescribe la lógica de campañas.
- Mientras tanto, **proveedor simulado** (modo prueba que registra el envío sin mandarlo) para
  construir y testear el flujo.
- **Reglas críticas:** solo a clientes con **opt-in**; envíos proactivos requieren **plantillas
  pre-aprobadas por Meta**; mostrar **categoría** de cada plantilla (Marketing = cara / Utility
  = barata / Authentication) y advertir si la campaña es Marketing; respetar ventana de 24 hs.
- **A construir:** catálogo de plantillas · armado de campaña (plantilla + segmento + vista
  previa de alcance + estimación de costo + confirmación) · envío (inmediato o programado) ·
  reporte de resultados (enviados/entregados/leídos/errores + costo) · multi-empresa.

> ⚠️ **A DEFINIR (Q6):** confirmar el BSP elegido antes de codear la integración concreta.

---

## 10. Plan de fases

- **Fase 0 — Base:** Next.js + Supabase, login, multiempresa (login único con cambio de
  empresa), alta de usuarios y roles, super admin, impersonar, RLS base. Confirmar matriz de
  permisos (§4.3) antes de codear seguridad.
- **Fase 1 — Núcleo:** ficha cliente/ahorrista, **bitácora**, **importación Excel de Ford**,
  unicidad DNI/CUIT y N° de solicitud, asignación a vendedor.
- **Fase 2 — Ventas:** recepción carga leads, vendedor gestiona, presupuestos, catálogo de
  planes, cierre de venta, reasignación, supervisión de ventas.
- **Fase 3 — Administración por estadios:** Scoring (con alertas), Agrupamiento (tras
  definirlo), Gestión de cliente, Adjudicación, Pedido, Patentamiento, Entrega.
- **Fase 4 — Campañas y notificaciones por WhatsApp.**
- **Fase 5 — Informes y tableros gerenciales + exportaciones + auditoría completa.**

---

## 11. Preguntas abiertas (pendientes de confirmar con el cliente)

| # | Tema | Estado |
|---|---|---|
| Q1 | Stack Next.js + Supabase + Vercel | ✅ Confirmado (Next.js) |
| Q5 | Modelo de login multiempresa | ✅ Confirmado (login único con cambio de empresa) |
| Q2 | Matriz de permisos Rol × Acción (§4.3) | ⏳ Pendiente de aprobación |
| Q3 | Reglas de la etapa **Agrupamiento** (§6.2) | ⏳ A definir |
| Q4 | Formatos reales de importación | ✅ Resuelto en parte: tenemos **Novedades/cartera** (§5.bis.1) y la planilla (§5.bis.2). Falta confirmar si además importan el export de **solicitudes Plan Óvalo** y para qué. |
| Q6 | Herramienta/BSP de WhatsApp (§9) | ⏳ A definir (mientras tanto, proveedor simulado) |
| — | Alcance de unicidad de documento: ¿global o por empresa? (§3.6) | ⏳ A confirmar |
| — | Rol "Gerencia/Dirección (lectura)": ¿se incluye? (§4.2) | ⏳ A confirmar |
| N1 | **Motor de cálculo de la planilla** (gastos de patentamiento, requisitos, licitación, hoja de pedido): ¿se replica dentro del sistema en Fase 3? Es alcance significativo. | ⏳ A confirmar prioridad |
| N2 | **Jurisdicciones de patentamiento** a cubrir (hoy Neuquén y Río Negro) y quién mantiene los valores de arancel/sellado. | ⏳ A confirmar |
| N3 | Archivos recibidos (2026-06-25): cartera **Novedades** (§5.bis.1), **planilla** (§5.bis.2), **Adjudicatarios sin pedido** (§5.bis.3), **Ganadores de acto** (§5.bis.4), **cta cte concesionario** (§5.bis.5), **movimiento por adherente** (§5.bis.6). Falta: **lista de precios** como archivo aparte (por ahora se toma de la solapa Precio). | ✅ En su mayoría recibidos |
| N4 | Mapeo de **STATUS de cartera → estadio** del cliente (códigos 2/4/9/…). | ⏳ A definir con el cliente |
| N5 | **Layout posicional** del archivo `adh_*.txt` (§5.bis.6): hace falta el diseño de registro para parsearlo. | ⏳ Pedir al cliente |
| N6 | `cta_cte_*.txt` es la cuenta de la **concesionaria con la administradora**, no del cliente. ¿Entra en alcance (finanzas/conciliación) o queda fuera? | ⏳ A confirmar |

---

## 12. Cómo levantar el proyecto

El código de la app vive en la subcarpeta **`planes-ahorro/`**.

### 12.1 Probar en la computadora (modo demo, sin configurar nada)
1. Instalar **Node.js 20+** (una sola vez).
2. Abrir una terminal dentro de `planes-ahorro/` y ejecutar:
   ```bash
   npm install      # baja las dependencias (una vez)
   npm run dev      # levanta la app en http://localhost:3000
   ```
3. Abrir el navegador en **http://localhost:3000**. Como todavía no hay Supabase configurado,
   arranca en **modo demo**: en la pantalla de login aparecen usuarios de ejemplo (super admin,
   vendedor, administración, terciarizada, etc.). Hacé clic en uno y entrá para ver cómo cambia
   el acceso de cada rol. El super admin puede **impersonar** a cualquiera y cambiar de empresa.

### 12.2 Conectar el backend real (Supabase) — cuando se decida
1. Crear un proyecto en https://supabase.com (región São Paulo `sa-east-1`).
2. En el editor SQL de Supabase, ejecutar `supabase/migrations/0001_fase0.sql` y luego
   `supabase/seed.sql`.
3. Copiar `planes-ahorro/.env.example` a `planes-ahorro/.env.local` y completar
   `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API).
4. Crear los usuarios en **Supabase Auth** y, con el mismo `id`, insertarlos en la tabla
   `usuario`, asignarles roles (`usuario_rol`) y empresas (`membresia_empresa`).
5. Al tener las variables cargadas, la app deja el modo demo y usa Supabase. (La capa de datos
   que reemplaza a los datos demo se implementa al inicio de Fase 1.)

### 12.3 Publicar en internet (Vercel)
1. Subir el repositorio a GitHub (ya está).
2. En https://vercel.com → New Project → elegir el repo, y como **Root Directory** indicar
   `planes-ahorro`.
3. Cargar las mismas variables de entorno del paso 12.2 en Vercel.
4. Deploy. Vercel da una URL pública para usar desde cualquier lado.

### 12.4 Estructura del código (Fase 0)
```
planes-ahorro/
  src/app/                  rutas (login, dashboard, admin/empresas|usuarios|roles)
  src/components/           AppShell (sidebar, selector de empresa, banner de impersonar) + ui/
  src/lib/                  tipos, roles+matriz de permisos, datos demo, sesión, cliente Supabase
  supabase/migrations/      esquema SQL + RLS (Fase 0)
  supabase/seed.sql         empresas iniciales (CUIT reales) y catálogo de roles
```
