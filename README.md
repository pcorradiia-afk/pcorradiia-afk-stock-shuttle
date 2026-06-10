# Grupo Fiorasi · Control & Gestión

Sistema **multiempresa y multiusuario** de control, auditoría y análisis de gestión
para un grupo de concesionarias de vehículos.

> Estado: **Fase 0 + 1 (modo demo)**. La app corre con datos ficticios y el RBAC
> funcionando. El backend real (Supabase) se conecta en la Fase 2.

## Qué incluye hoy

- **Login por perfil** (demo): probá cómo cambian los accesos según el rol.
- **Layout** con sidebar, selector de empresa y vista **consolidada del grupo**.
- **Tablero** con KPIs y gráficos: facturación, resultado, unidades y mora.
- **Rentabilidad por departamento** (0km, usados, posventa, repuestos, admin).
- **Ventas y márgenes** (0km vs usados, ranking por empresa).
- **Cuentas corrientes y mora** (antigüedad de saldos).
- **Auditoría y hallazgos** con severidad, estado y seguimiento.
- **Administración**: empresas, usuarios y **matriz de roles/permisos**.
- **RBAC granular**: usuarios que ven todo el grupo, una empresa, o solo ciertos módulos.

## Roles predefinidos

| Rol | Empresas | Puede |
|---|---|---|
| SuperAdmin | Todas | Configurar empresas, usuarios y roles |
| Dirección | Todas (grupo) | Ver tableros e informes (lectura) |
| Controller / Gerencia | Asignadas | Importar, analizar, armar tableros |
| Auditoría interna | Lectura amplia | Ver todo + gestionar hallazgos |
| Responsable de empresa | La suya | Ver y cargar lo de su empresa |

## Tecnologías

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui (Radix)
- TanStack Query · Recharts · SheetJS (`xlsx`)
- Backend previsto: **Supabase** (PostgreSQL + Auth + RLS + Storage)
- Deploy previsto: **Vercel** (frontend) + Supabase región São Paulo

## Desarrollo local

```bash
npm install
npm run dev      # http://localhost:8080
npm run build    # compila a /dist
```

## Estructura

```
src/
  auth/         RBAC: permisos, roles, navegación, contexto de sesión
  components/   layout (AppShell, selector de empresa) + ui-kit + ui/ (shadcn)
  data/         datos demo + selectores de consulta
  lib/          formateadores ($ AR, fechas) y utilidades
  pages/        Login, Dashboard, Rentabilidad, Comercial, Cuentas corrientes,
                Auditoría, Importar, admin/(Empresas, Usuarios, Roles)
  types/        modelo de dominio
```

El plan completo del sistema está en [`docs/PLAN.md`](docs/PLAN.md).
