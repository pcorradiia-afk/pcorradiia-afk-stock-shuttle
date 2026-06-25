# Planes de Ahorro · Grupo Corradi

Sistema de gestión y seguimiento de **planes de ahorro** (ahorristas de Plan Óvalo Ford) para
**PEDRO CORRADI S.A.** y **SAPAC S.A. (Fiorasi)**.

> Estado: **Fase 0 (modo demo)**. Next.js + Supabase. Login, multiempresa con un solo acceso,
> usuarios, matriz de roles/permisos e impersonar funcionando con datos de ejemplo. El esquema
> de base de datos con seguridad por empresa (RLS) ya está listo en `supabase/`.

## Probarlo en 2 minutos (sin configurar nada)

```bash
npm install
npm run dev        # abrí http://localhost:3000
```

Arranca en **modo demo**: en el login hay usuarios de ejemplo (super admin, vendedor,
administración, terciarizada, etc.). Entrá con cualquiera para ver cómo cambia el acceso.

## Documentación

Todo el plan, modelo de datos, matriz de permisos, formatos de importación reales y el paso a
paso para conectar Supabase y publicar en Vercel está en **[`CLAUDE.md`](./CLAUDE.md)**.

## Stack

Next.js (App Router, TypeScript) · Tailwind CSS · Supabase (PostgreSQL + Auth + RLS) ·
Deploy en Vercel.
