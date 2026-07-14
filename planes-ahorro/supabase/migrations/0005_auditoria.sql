-- =====================================================================
-- Planes de Ahorro — Auditoría (log de acciones)
-- Ejecutar en el SQL Editor DESPUÉS de 0004.
-- Mismo patrón que el resto: (id, empresa_id, data jsonb).
-- =====================================================================

create table if not exists log_auditoria (
  id         text primary key,
  empresa_id text not null references empresa(id),
  data       jsonb not null
);

create index if not exists log_auditoria_empresa on log_auditoria (empresa_id);

alter table log_auditoria enable row level security;

drop policy if exists log_auditoria_select on log_auditoria;
create policy log_auditoria_select on log_auditoria for select
  using (empresa_id in (select empresas_visibles()));
drop policy if exists log_auditoria_write on log_auditoria;
create policy log_auditoria_write on log_auditoria for insert
  with check (empresa_id in (select empresas_visibles()));
-- Sin update/delete: el log es de solo agregado (nadie lo edita ni lo borra desde la app).
