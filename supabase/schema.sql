-- ============================================================================
-- Esquema de Supabase · Sistema de control de gestión Grupo Fiorasi
-- Fase 2 · Persistencia de las importaciones del DMS.
--
-- Cómo usarlo: en tu proyecto de Supabase → SQL Editor → New query →
-- pegá TODO este archivo → Run. Es idempotente: podés correrlo más de una vez.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Empresas del grupo (tabla de referencia, las FK de importaciones apuntan acá)
-- ---------------------------------------------------------------------------
create table if not exists public.empresas (
  id           text primary key,
  nombre       text not null,
  razon_social text,
  cuit         text,
  provincia    text,
  marcas       text[] default '{}',
  dms          text check (dms in ('Oliauto', 'Autologica')),
  consolida    boolean not null default true,
  activa       boolean not null default true
);

-- Semilla con las empresas reales del grupo. Al re-ejecutar, actualiza los datos
-- editables (nombre, provincia, marcas, dms) sin perder las importaciones.
insert into public.empresas (id, nombre, razon_social, cuit, provincia, marcas, dms, consolida, activa) values
  ('e1', 'Pedro Corradi',                  'Pedro Corradi',                  '33-52033241-9', 'Chubut',  array['Ford'],            'Oliauto',    true, true),
  ('e2', 'Automotores Fiorasi y Corradi',  'Automotores Fiorasi y Corradi',  '30-67052859-2', 'Chubut',  array['Volkswagen'],      'Oliauto',    true, true),
  ('e3', 'Fiorasi',                        'Fiorasi S.A.',                   '30-53563811-6', 'Chubut',  array['Iveco','Fiat'],    'Oliauto',    true, true),
  ('e4', 'Fiorasi Motors',                 'Fiorasi Motors',                 '30-69104466-8', 'Chubut',  array['Jeep','Ram'],      'Oliauto',    true, true),
  ('e5', 'Sapac',                          'Sapac',                          '30-59970938-6', 'Neuquén', array['Ford'],            'Autologica', true, true)
on conflict (id) do update set
  nombre       = excluded.nombre,
  razon_social = excluded.razon_social,
  cuit         = excluded.cuit,
  provincia    = excluded.provincia,
  marcas       = excluded.marcas,
  dms          = excluded.dms;

-- ---------------------------------------------------------------------------
-- Importaciones: cada carga de un reporte del DMS, con su análisis ya calculado.
-- El detalle calculado (P&L por depto, antigüedad de cuentas, etc.) se guarda
-- en `payload` (JSONB) para no atarnos a un esquema rígido en esta fase.
-- ---------------------------------------------------------------------------
create table if not exists public.importaciones (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  text not null references public.empresas (id),
  tipo        text not null check (tipo in ('balance_parcial', 'composicion', 'balance_general', 'mayor')),
  -- Para balance parcial: 'YYYY-MM' del último período. Para composición: fecha de corte.
  periodo     text,
  corte       date,
  archivo     text not null,
  -- Métricas rápidas para listar sin abrir el payload.
  resumen     jsonb not null default '{}'::jsonb,
  -- Resultado completo del parser (BalanceParcial | Composicion).
  payload     jsonb not null,
  creado_por  text,
  creado_el   timestamptz not null default now()
);

create index if not exists importaciones_empresa_idx on public.importaciones (empresa_id);
create index if not exists importaciones_tipo_idx    on public.importaciones (tipo);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- ⚠️ MVP: estas políticas permiten lectura/escritura con la anon key (la que
-- usa el frontend). Es suficiente para empezar a persistir de forma interna,
-- pero la anon key es pública. Antes de exponer la app, reemplazá estas
-- políticas por unas basadas en Supabase Auth (auth.uid()) — ver SUPABASE_SETUP.md.
-- ---------------------------------------------------------------------------
alter table public.empresas      enable row level security;
alter table public.importaciones enable row level security;

drop policy if exists empresas_lectura on public.empresas;
create policy empresas_lectura on public.empresas
  for select using (true);

drop policy if exists importaciones_lectura on public.importaciones;
create policy importaciones_lectura on public.importaciones
  for select using (true);

drop policy if exists importaciones_alta on public.importaciones;
create policy importaciones_alta on public.importaciones
  for insert with check (true);

drop policy if exists importaciones_baja on public.importaciones;
create policy importaciones_baja on public.importaciones
  for delete using (true);
