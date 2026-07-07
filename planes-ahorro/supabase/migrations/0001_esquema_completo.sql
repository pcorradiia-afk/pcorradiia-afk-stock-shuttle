-- =====================================================================
-- Planes de Ahorro · Grupo Corradi — ESQUEMA COMPLETO (multiusuario v1)
-- CÓMO USAR: en Supabase → SQL Editor → pegar TODO este archivo → Run.
-- Se puede volver a correr sin romper datos (es idempotente).
-- =====================================================================

create extension if not exists pgcrypto;

-- =====================================================================
-- 1) ORGANIZACIÓN Y ACCESO
-- =====================================================================
create table if not exists empresa (
  id text primary key,                 -- 'pc' | 'sapac' (los mismos ids que usa la app)
  nombre text not null,
  nombre_comercial text not null,
  cuit text not null unique,
  activo boolean not null default true
);

insert into empresa (id, nombre, nombre_comercial, cuit) values
  ('pc',    'PEDRO CORRADI S.A.', 'Pedro Corradi', '33-52033241-9'),
  ('sapac', 'SAPAC S.A.',         'Fiorasi',       '30-59970938-6')
on conflict (id) do nothing;

-- usuario.id = id del usuario en Supabase Auth (Authentication → Users)
create table if not exists usuario (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  email text not null unique,
  empresa_id text not null references empresa(id),
  tipo_perfil text not null default 'concesionario'
    check (tipo_perfil in ('concesionario','terciarizada')),
  gestion_id text,                     -- solo terciarizadas: aísla su cartera
  activo boolean not null default true
);

create table if not exists usuario_rol (
  usuario_id uuid not null references usuario(id) on delete cascade,
  rol_id text not null,                -- super_admin | recepcion | vendedor | supervisor_ventas |
                                       -- administracion | supervisor_administracion | entregas |
                                       -- analista_suscripciones | gerencia
  primary key (usuario_id, rol_id)
);

-- Empresas que el usuario puede operar con un único login.
create table if not exists membresia_empresa (
  usuario_id uuid not null references usuario(id) on delete cascade,
  empresa_id text not null references empresa(id) on delete cascade,
  primary key (usuario_id, empresa_id)
);

-- Estadios de administración habilitados por usuario.
create table if not exists acceso_estadio (
  usuario_id uuid not null references usuario(id) on delete cascade,
  estadio text not null,
  primary key (usuario_id, estadio)
);

-- =====================================================================
-- 2) HELPERS DE SEGURIDAD (los usan las políticas RLS)
-- =====================================================================
create or replace function es_super_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from usuario_rol where usuario_id = auth.uid() and rol_id = 'super_admin') $$;

create or replace function empresas_visibles() returns setof text
language sql stable security definer set search_path = public as
$$
  select id from empresa where es_super_admin()
  union
  select empresa_id from membresia_empresa where usuario_id = auth.uid()
$$;

create or replace function mi_tipo_perfil() returns text
language sql stable security definer set search_path = public as
$$ select tipo_perfil from usuario where id = auth.uid() $$;

create or replace function mi_gestion() returns text
language sql stable security definer set search_path = public as
$$ select gestion_id from usuario where id = auth.uid() $$;

-- Vendedor "puro" (sin otro rol amplio): solo ve sus clientes asignados.
create or replace function es_solo_vendedor() returns boolean
language sql stable security definer set search_path = public as
$$
  select exists (select 1 from usuario_rol where usuario_id = auth.uid() and rol_id = 'vendedor')
     and not exists (select 1 from usuario_rol where usuario_id = auth.uid() and rol_id <> 'vendedor')
$$;

create or replace function usuarios_de_mis_empresas() returns setof uuid
language sql stable security definer set search_path = public as
$$ select id from usuario where empresa_id in (select empresas_visibles()) $$;

-- =====================================================================
-- 3) DATOS DEL NEGOCIO
-- La app guarda cada entidad completa en "data" (jsonb). Columnas generadas
-- aplican las reglas duras (unicidad de N° de solicitud y de documento).
-- =====================================================================
create table if not exists cliente (
  id text primary key,
  empresa_id text not null references empresa(id),
  data jsonb not null,
  nro_solicitud text generated always as (data#>>'{solicitud,nroSolicitud}') stored,
  documento_norm text generated always as
    (nullif(regexp_replace(coalesce(data->>'documento',''), '\D', '', 'g'), '')) stored,
  gestion_id text generated always as (data->>'gestionId') stored,
  vendedor_id text generated always as (data->>'vendedorId') stored,
  actualizado_en timestamptz not null default now()
);
-- Regla §3.6: N° de solicitud ÚNICO E IRREPETIBLE (global).
create unique index if not exists cliente_nro_solicitud_unico
  on cliente (nro_solicitud) where nro_solicitud is not null;
-- Regla §3.6: documento único por empresa.
create unique index if not exists cliente_documento_unico
  on cliente (empresa_id, documento_norm) where documento_norm is not null;
create index if not exists cliente_empresa_idx on cliente (empresa_id);

create table if not exists comunicacion (
  id text primary key,
  empresa_id text not null references empresa(id),
  data jsonb not null,
  creado_en timestamptz not null default now()
);
create index if not exists comunicacion_empresa_idx on comunicacion (empresa_id);

create table if not exists plan (
  id text primary key,
  empresa_id text not null references empresa(id),
  data jsonb not null
);

create table if not exists observacion_scoring (
  id text primary key,
  empresa_id text not null references empresa(id),
  data jsonb not null
);

create table if not exists alerta (
  id text primary key,
  empresa_id text not null references empresa(id),
  data jsonb not null
);

create table if not exists tarea (
  id text primary key,
  empresa_id text not null references empresa(id),
  data jsonb not null
);

create table if not exists movimiento_ctacte (
  id text primary key,
  empresa_id text not null references empresa(id),
  data jsonb not null
);

create table if not exists meta (
  empresa_id text not null references empresa(id),
  clave text not null,
  valor text not null,
  primary key (empresa_id, clave)
);

-- =====================================================================
-- 4) ROW LEVEL SECURITY
-- =====================================================================
alter table empresa            enable row level security;
alter table usuario            enable row level security;
alter table usuario_rol        enable row level security;
alter table membresia_empresa  enable row level security;
alter table acceso_estadio     enable row level security;
alter table cliente            enable row level security;
alter table comunicacion       enable row level security;
alter table plan               enable row level security;
alter table observacion_scoring enable row level security;
alter table alerta             enable row level security;
alter table tarea              enable row level security;
alter table movimiento_ctacte  enable row level security;
alter table meta               enable row level security;

-- Empresa: lectura para sus miembros; escritura solo super admin.
drop policy if exists empresa_sel on empresa;
create policy empresa_sel on empresa for select using (id in (select empresas_visibles()));
drop policy if exists empresa_mod on empresa;
create policy empresa_mod on empresa for all using (es_super_admin()) with check (es_super_admin());

-- Usuario y sus tablas satélite: se ven los colegas de la misma empresa
-- (necesario para asignar vendedores/tareas); escribe solo super admin.
drop policy if exists usuario_sel on usuario;
create policy usuario_sel on usuario for select
  using (id = auth.uid() or es_super_admin() or empresa_id in (select empresas_visibles()));
drop policy if exists usuario_mod on usuario;
create policy usuario_mod on usuario for all using (es_super_admin()) with check (es_super_admin());

drop policy if exists usuario_rol_sel on usuario_rol;
create policy usuario_rol_sel on usuario_rol for select
  using (usuario_id = auth.uid() or es_super_admin() or usuario_id in (select usuarios_de_mis_empresas()));
drop policy if exists usuario_rol_mod on usuario_rol;
create policy usuario_rol_mod on usuario_rol for all using (es_super_admin()) with check (es_super_admin());

drop policy if exists membresia_sel on membresia_empresa;
create policy membresia_sel on membresia_empresa for select
  using (usuario_id = auth.uid() or es_super_admin() or usuario_id in (select usuarios_de_mis_empresas()));
drop policy if exists membresia_mod on membresia_empresa;
create policy membresia_mod on membresia_empresa for all using (es_super_admin()) with check (es_super_admin());

drop policy if exists acceso_estadio_sel on acceso_estadio;
create policy acceso_estadio_sel on acceso_estadio for select
  using (usuario_id = auth.uid() or es_super_admin() or usuario_id in (select usuarios_de_mis_empresas()));
drop policy if exists acceso_estadio_mod on acceso_estadio;
create policy acceso_estadio_mod on acceso_estadio for all using (es_super_admin()) with check (es_super_admin());

-- Cliente: aislamiento por empresa + terciarizada (su gestión) + vendedor puro (lo suyo).
drop policy if exists cliente_sel on cliente;
create policy cliente_sel on cliente for select using (
  empresa_id in (select empresas_visibles())
  and (mi_tipo_perfil() <> 'terciarizada' or gestion_id = mi_gestion())
  and (not es_solo_vendedor() or vendedor_id = auth.uid()::text)
);
drop policy if exists cliente_mod on cliente;
create policy cliente_mod on cliente for all using (
  empresa_id in (select empresas_visibles())
  and (mi_tipo_perfil() <> 'terciarizada' or gestion_id = mi_gestion())
) with check (empresa_id in (select empresas_visibles()));

-- Resto de tablas de negocio: aislamiento por empresa (las reglas finas por rol
-- las aplica la app; ver CLAUDE.md I2/I11 para el endurecimiento futuro).
do $$
declare t text;
begin
  foreach t in array array['comunicacion','plan','observacion_scoring','alerta','tarea','movimiento_ctacte','meta'] loop
    execute format('drop policy if exists %I_sel on %I', t, t);
    execute format('create policy %I_sel on %I for select using (empresa_id in (select empresas_visibles()))', t, t);
    execute format('drop policy if exists %I_mod on %I', t, t);
    execute format('create policy %I_mod on %I for all using (empresa_id in (select empresas_visibles())) with check (empresa_id in (select empresas_visibles()))', t, t);
  end loop;
end $$;

-- =====================================================================
-- 5) ALTA DE USUARIOS DE LA APP (después de crearlos en Authentication)
--    Ejemplo:
--    select alta_usuario('maria@empresa.com', 'María Pérez', 'pc',
--                        array['administracion'], 'concesionario', null, '{}');
--    Roles válidos: super_admin, recepcion, vendedor, supervisor_ventas,
--    administracion, supervisor_administracion, entregas,
--    analista_suscripciones, gerencia.
-- =====================================================================
create or replace function alta_usuario(
  p_email text,
  p_nombre text,
  p_empresa text,
  p_roles text[],
  p_tipo text default 'concesionario',
  p_gestion text default null,
  p_empresas_extra text[] default '{}'
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  e text;
begin
  -- Solo el super admin puede dar altas (salvo el primer usuario del sistema).
  if exists (select 1 from usuario_rol where rol_id = 'super_admin')
     and not es_super_admin() and auth.uid() is not null then
    return 'ERROR: solo el super admin puede dar de alta usuarios.';
  end if;

  select id into v_id from auth.users where lower(email) = lower(p_email);
  if v_id is null then
    return 'ERROR: primero creá el usuario en Authentication → Users con el email ' || p_email;
  end if;

  insert into usuario (id, nombre, email, empresa_id, tipo_perfil, gestion_id)
  values (v_id, p_nombre, lower(p_email), p_empresa, p_tipo, p_gestion)
  on conflict (id) do update
    set nombre = excluded.nombre, empresa_id = excluded.empresa_id,
        tipo_perfil = excluded.tipo_perfil, gestion_id = excluded.gestion_id, activo = true;

  delete from usuario_rol where usuario_id = v_id;
  insert into usuario_rol (usuario_id, rol_id) select v_id, unnest(p_roles);

  insert into membresia_empresa (usuario_id, empresa_id) values (v_id, p_empresa)
  on conflict do nothing;
  foreach e in array p_empresas_extra loop
    insert into membresia_empresa (usuario_id, empresa_id) values (v_id, e)
    on conflict do nothing;
  end loop;

  return 'OK: ' || p_email || ' dado de alta en ' || p_empresa;
end $$;

revoke execute on function alta_usuario(text, text, text, text[], text, text, text[]) from anon;
