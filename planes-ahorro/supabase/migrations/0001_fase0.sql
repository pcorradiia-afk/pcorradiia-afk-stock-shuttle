-- =====================================================================
-- Planes de Ahorro · Grupo Corradi — Fase 0 (organización + accesos)
-- PostgreSQL / Supabase. Ver planes-ahorro/CLAUDE.md §3 y §4.
-- =====================================================================

-- --------- Tipos ---------
do $$ begin
  create type tipo_perfil as enum ('concesionario', 'terciarizada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estadio as enum
    ('scoring','agrupamiento','gestion_cliente','adjudicacion','pedido','patentamiento','entrega');
exception when duplicate_object then null; end $$;

-- --------- Organización ---------
create table if not exists empresa (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  nombre_comercial text not null,
  cuit        text not null unique,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

create table if not exists sucursal (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresa(id) on delete cascade,
  nombre      text not null,
  activo      boolean not null default true
);

create table if not exists equipo (
  id          uuid primary key default gen_random_uuid(),
  sucursal_id uuid not null references sucursal(id) on delete cascade,
  nombre      text not null,
  tipo        text not null check (tipo in ('ventas','administracion'))
);

-- --------- Usuarios y accesos ---------
-- usuario.id = auth.users.id (Supabase Auth)
create table if not exists usuario (
  id           uuid primary key references auth.users(id) on delete cascade,
  nombre       text not null,
  email        text not null unique,
  empresa_id   uuid not null references empresa(id),
  sucursal_id  uuid references sucursal(id),
  equipo_id    uuid references equipo(id),
  tipo_perfil  tipo_perfil not null default 'concesionario',
  gestion_id   uuid,                       -- para terciarizadas (aislamiento por gestión)
  activo       boolean not null default true,
  creado_en    timestamptz not null default now()
);

create table if not exists rol (
  id     text primary key,                 -- 'super_admin', 'vendedor', ...
  nombre text not null
);

create table if not exists usuario_rol (
  usuario_id uuid not null references usuario(id) on delete cascade,
  rol_id     text not null references rol(id),
  empresa_id uuid references empresa(id),  -- rol acotado por empresa (null = todas las suyas)
  primary key (usuario_id, rol_id, empresa_id)
);

-- Empresas que un usuario puede operar con un único login (multiempresa).
create table if not exists membresia_empresa (
  usuario_id uuid not null references usuario(id) on delete cascade,
  empresa_id uuid not null references empresa(id) on delete cascade,
  alcance    text not null default 'empresa' check (alcance in ('empresa','grupo')),
  primary key (usuario_id, empresa_id)
);

-- Estadios de administración habilitados por usuario (los asigna el super admin).
create table if not exists acceso_estadio (
  usuario_id uuid not null references usuario(id) on delete cascade,
  estadio    estadio not null,
  primary key (usuario_id, estadio)
);

create table if not exists log_auditoria (
  id            bigserial primary key,
  usuario_id    uuid references usuario(id),
  accion        text not null,
  entidad       text not null,
  entidad_id    text,
  dato_anterior jsonb,
  dato_nuevo    jsonb,
  fecha_hora    timestamptz not null default now()
);

-- =====================================================================
-- Helpers de seguridad (SECURITY DEFINER) para usar en políticas RLS
-- =====================================================================
create or replace function es_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from usuario_rol ur
    where ur.usuario_id = auth.uid() and ur.rol_id = 'super_admin'
  );
$$;

-- Empresas que el usuario actual puede ver (sus membresías; super admin = todas).
create or replace function empresas_visibles()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from empresa where es_super_admin()
  union
  select empresa_id from membresia_empresa where usuario_id = auth.uid();
$$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table empresa            enable row level security;
alter table sucursal           enable row level security;
alter table equipo             enable row level security;
alter table usuario            enable row level security;
alter table usuario_rol        enable row level security;
alter table membresia_empresa  enable row level security;
alter table acceso_estadio     enable row level security;
alter table log_auditoria      enable row level security;

-- Empresa: ve las suyas; solo super admin escribe.
drop policy if exists empresa_select on empresa;
create policy empresa_select on empresa for select using (id in (select empresas_visibles()));
drop policy if exists empresa_write on empresa;
create policy empresa_write on empresa for all using (es_super_admin()) with check (es_super_admin());

-- Sucursal / equipo: visibles según empresa; escribe super admin.
drop policy if exists sucursal_select on sucursal;
create policy sucursal_select on sucursal for select using (empresa_id in (select empresas_visibles()));
drop policy if exists sucursal_write on sucursal;
create policy sucursal_write on sucursal for all using (es_super_admin()) with check (es_super_admin());

drop policy if exists equipo_select on equipo;
create policy equipo_select on equipo for select using (
  sucursal_id in (select s.id from sucursal s where s.empresa_id in (select empresas_visibles()))
);
drop policy if exists equipo_write on equipo;
create policy equipo_write on equipo for all using (es_super_admin()) with check (es_super_admin());

-- Usuario: cada uno se ve a sí mismo; super admin ve/gestiona todos.
drop policy if exists usuario_select on usuario;
create policy usuario_select on usuario for select using (id = auth.uid() or es_super_admin());
drop policy if exists usuario_write on usuario;
create policy usuario_write on usuario for all using (es_super_admin()) with check (es_super_admin());

-- Roles/membresías/estadios: el propio usuario los lee; super admin gestiona.
drop policy if exists usuario_rol_select on usuario_rol;
create policy usuario_rol_select on usuario_rol for select using (usuario_id = auth.uid() or es_super_admin());
drop policy if exists usuario_rol_write on usuario_rol;
create policy usuario_rol_write on usuario_rol for all using (es_super_admin()) with check (es_super_admin());

drop policy if exists membresia_select on membresia_empresa;
create policy membresia_select on membresia_empresa for select using (usuario_id = auth.uid() or es_super_admin());
drop policy if exists membresia_write on membresia_empresa;
create policy membresia_write on membresia_empresa for all using (es_super_admin()) with check (es_super_admin());

drop policy if exists acceso_estadio_select on acceso_estadio;
create policy acceso_estadio_select on acceso_estadio for select using (usuario_id = auth.uid() or es_super_admin());
drop policy if exists acceso_estadio_write on acceso_estadio;
create policy acceso_estadio_write on acceso_estadio for all using (es_super_admin()) with check (es_super_admin());

-- Auditoría: la lee super admin / sup. administración; inserción desde backend.
drop policy if exists auditoria_select on log_auditoria;
create policy auditoria_select on log_auditoria for select using (
  es_super_admin() or exists (
    select 1 from usuario_rol ur where ur.usuario_id = auth.uid()
      and ur.rol_id in ('supervisor_administracion','gerencia')
  )
);

-- --------- Catálogo de roles ---------
insert into rol (id, nombre) values
  ('super_admin','Administrador del sistema'),
  ('recepcion','Recepción'),
  ('vendedor','Vendedor'),
  ('supervisor_ventas','Supervisor de ventas'),
  ('administracion','Administración'),
  ('supervisor_administracion','Supervisor de administración'),
  ('entregas','Entregas'),
  ('analista_suscripciones','Analista de suscripciones'),
  ('gerencia','Gerencia / Dirección (lectura)')
on conflict (id) do nothing;
