# Plan del sistema — Grupo Fiorasi · Control & Gestión

## Contexto
- **Rubro:** grupo de concesionarias de vehículos (4-6 empresas).
- **Departamentos:** 0km, usados, posventa/taller, repuestos, administración.
- **Datos:** exportaciones Excel del **DMS** → importación con mapeo de columnas.
  El grupo usa **dos DMS**: **Oliauto** (Pedro Corradi, Automotores Fiorasi y Corradi, Fiorasi, Fiorasi Motors)
  y **Autologica** (Sapac). Cada uno necesita su propio mapeo de columnas.
- **Detalle:** saldos/mayores mensuales por cuenta (no transaccional).
- **Moneda:** pesos, sin ajustes (dólar/inflación más adelante).
- **Foco inicial:** rentabilidad por departamento · ventas/unidades y márgenes · cuentas corrientes/mora.
- **Auditoría:** desvíos de gestión + control interno + cumplimiento (priorizando desvíos).
- **Usuarios:** Dirección (grupo, lectura) · Controller/Gerencia · Auditoría interna · Responsable por empresa.

## Stack
React + TypeScript + Vite · Tailwind + shadcn/ui · TanStack Query · Recharts ·
SheetJS (`xlsx`) · **Supabase** (PostgreSQL + Auth + RLS + Storage).
Deploy: **Vercel** (frontend) + Supabase región São Paulo (sa-east-1).

## Modelo de datos (núcleo)
- Organización: `empresas` → `sucursales` → `departamentos`.
- Acceso: `profiles`, `memberships` (usuario↔empresa↔rol, `scope=grupo`), `roles`, `permissions`, `audit_log`.
- Financiero: `plan_de_cuentas`, `periodos`, `saldos_mensuales` (cuenta × departamento × período).
- Comercial: `operaciones_venta`.
- Cuentas corrientes: `saldos_cc` con antigüedad (aging).
- Gestión: `presupuestos`, `kpis`/`metas`, `alertas`.
- Auditoría: `hallazgos`, `checklists_control`, `vencimientos`.
- Importación: `importaciones` + `staging`.
- **RLS** en todas las tablas: aislamiento por empresa según membresías.

## Fases
- **Fase 0 — Reset & esqueleto** ✅ login, layout, selector de empresa, navegación.
- **Fase 1 — Núcleo multiempresa + Auth + RBAC** ✅ (demo) roles/permisos, guards, admin.
- **Fase 2 — Importador del DMS + modelo financiero** · Supabase + import Excel con mapeo y staging.
- **Fase 3 — Los 3 focos** · rentabilidad por depto, comercial, cuentas corrientes (sobre datos reales).
- **Fase 4 — Presupuesto y desvíos** · auditoría de gestión + alertas.
- **Fase 5 — Control interno y cumplimiento** · checklists, conciliaciones, hallazgos, vencimientos, reportes.

## Definiciones pendientes
- ¿Las empresas consolidan entre sí (intercompañía)?
- Cantidad de sucursales por empresa.
- ¿Multimarca? ¿Qué marcas?
- Histórico a cargar (meses/años) y cantidad de usuarios.
- KPIs/metas, alertas por email, reportes de salida, conciliaciones, 2FA (cada uno en su fase).

## Conexión a Supabase (Fase 2)
1. Crear proyecto en https://supabase.com (región São Paulo).
2. Copiar `URL` y `anon key` a `.env` (ver `.env.example`).
3. Aplicar migraciones SQL (se agregarán en `supabase/migrations`).
4. La capa `src/data` pasa de datos demo a consultas Supabase con la misma forma de tipos.
