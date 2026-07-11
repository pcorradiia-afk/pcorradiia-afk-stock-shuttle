-- =====================================================================
-- Planes de Ahorro — Recordatorios de gestión y comisiones a comercializadoras
-- Ejecutar en el SQL Editor DESPUÉS de 0001 (y de 0002/0003 si aún no corrieron).
-- Mismo patrón que el resto de las tablas de datos: (id, empresa_id, data jsonb).
-- =====================================================================

create table if not exists recordatorio (
  id         text primary key,
  empresa_id text not null references empresa(id),
  data       jsonb not null
);

create table if not exists liquidacion_comision (
  id         text primary key,
  empresa_id text not null references empresa(id),
  data       jsonb not null
);

create index if not exists recordatorio_empresa on recordatorio (empresa_id);
create index if not exists liquidacion_comision_empresa on liquidacion_comision (empresa_id);

alter table recordatorio         enable row level security;
alter table liquidacion_comision enable row level security;

do $$
declare t text;
begin
  foreach t in array array['recordatorio','liquidacion_comision'] loop
    execute format('drop policy if exists %I_select on %I', t, t);
    execute format(
      'create policy %I_select on %I for select using (empresa_id in (select empresas_visibles()))', t, t);
    execute format('drop policy if exists %I_write on %I', t, t);
    execute format(
      'create policy %I_write on %I for all using (empresa_id in (select empresas_visibles())) with check (empresa_id in (select empresas_visibles()))', t, t);
  end loop;
end $$;
