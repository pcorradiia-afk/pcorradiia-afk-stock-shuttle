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
  tipo        text not null check (tipo in ('balance_parcial', 'composicion', 'balance_general', 'mayor', 'ventas_0km')),
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
-- Perfiles de usuario (autenticación real con Supabase Auth).
-- El usuario se crea en Authentication → Users; su fila acá (por email) define
-- rol, alcance y empresas. Sin perfil activo, la app no lo deja pasar.
-- ---------------------------------------------------------------------------
create table if not exists public.perfiles (
  email       text primary key,
  nombre      text not null,
  rol_id      text not null default 'responsable'
              check (rol_id in ('superadmin','direccion','controller','auditor','responsable')),
  scope       text not null default 'empresas' check (scope in ('grupo','empresas')),
  empresa_ids text[] not null default '{}',
  cargo       text default '',
  activo      boolean not null default true
);

-- Semilla: administrador inicial (editá/agregá los tuyos en Table Editor).
insert into public.perfiles (email, nombre, rol_id, scope, cargo) values
  ('fernandobogliacino@gmail.com', 'Fernando Bogliacino', 'superadmin', 'grupo', 'Dirección')
on conflict (email) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Con autenticación: solo usuarios logueados (rol authenticated) leen/escriben.
-- La anon key sin sesión NO accede a los datos. El robot usa la service role.
-- ---------------------------------------------------------------------------
-- ---------------------------------------------------------------------------
-- Anotaciones: notas de usuarios ancladas a un "contexto" (una pantalla o una
-- empresa/período puntual), para dejar comentarios donde se considere relevante.
-- ---------------------------------------------------------------------------
create table if not exists public.anotaciones (
  id          uuid primary key default gen_random_uuid(),
  contexto    text not null,            -- ej. 'tablero', 'cuentas-corrientes:e1'
  empresa_id  text references public.empresas (id),
  texto       text not null,
  autor       text,
  creado_el   timestamptz not null default now()
);
create index if not exists anotaciones_contexto_idx on public.anotaciones (contexto);

alter table public.empresas      enable row level security;
alter table public.importaciones enable row level security;
alter table public.anotaciones   enable row level security;
alter table public.perfiles      enable row level security;

-- Perfiles: cada usuario logueado puede leer los perfiles (la app necesita el
-- suyo y los superadmin ven el listado). Las altas/edits se hacen por Table Editor.
drop policy if exists perfiles_lectura on public.perfiles;
create policy perfiles_lectura on public.perfiles
  for select to authenticated using (true);

drop policy if exists anotaciones_lectura on public.anotaciones;
create policy anotaciones_lectura on public.anotaciones for select to authenticated using (true);
drop policy if exists anotaciones_alta on public.anotaciones;
create policy anotaciones_alta on public.anotaciones for insert to authenticated with check (true);
drop policy if exists anotaciones_baja on public.anotaciones;
create policy anotaciones_baja on public.anotaciones for delete to authenticated using (true);

drop policy if exists empresas_lectura on public.empresas;
create policy empresas_lectura on public.empresas
  for select to authenticated using (true);

drop policy if exists importaciones_lectura on public.importaciones;
create policy importaciones_lectura on public.importaciones
  for select to authenticated using (true);

drop policy if exists importaciones_alta on public.importaciones;
create policy importaciones_alta on public.importaciones
  for insert to authenticated with check (true);

drop policy if exists importaciones_baja on public.importaciones;
create policy importaciones_baja on public.importaciones
  for delete to authenticated using (true);
