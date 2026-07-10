-- =====================================================================
-- Planes de Ahorro — Fase 4: campañas de WhatsApp
-- Ejecutar en el SQL Editor DESPUÉS de 0001_esquema_completo.sql.
-- Mismo patrón que el resto de las tablas de datos: (id, empresa_id, data jsonb).
-- =====================================================================

create table if not exists plantilla_wa (
  id         text primary key,
  empresa_id text not null references empresa(id),
  data       jsonb not null
);

create table if not exists campania_wa (
  id         text primary key,
  empresa_id text not null references empresa(id),
  data       jsonb not null
);

create table if not exists envio_wa (
  id         text primary key,
  empresa_id text not null references empresa(id),
  data       jsonb not null
);

create index if not exists plantilla_wa_empresa on plantilla_wa (empresa_id);
create index if not exists campania_wa_empresa on campania_wa (empresa_id);
create index if not exists envio_wa_empresa on envio_wa (empresa_id);

alter table plantilla_wa enable row level security;
alter table campania_wa  enable row level security;
alter table envio_wa     enable row level security;

do $$
declare t text;
begin
  foreach t in array array['plantilla_wa','campania_wa','envio_wa'] loop
    execute format('drop policy if exists %I_select on %I', t, t);
    execute format(
      'create policy %I_select on %I for select using (empresa_id in (select empresas_visibles()))', t, t);
    execute format('drop policy if exists %I_write on %I', t, t);
    execute format(
      'create policy %I_write on %I for all using (empresa_id in (select empresas_visibles())) with check (empresa_id in (select empresas_visibles()))', t, t);
  end loop;
end $$;
