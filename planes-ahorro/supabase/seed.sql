-- Datos iniciales para Fase 0 (ejecutar después de 0001_fase0.sql).
-- Los CUIT son los reales provistos por el cliente.

insert into empresa (nombre, nombre_comercial, cuit) values
  ('PEDRO CORRADI S.A.', 'Pedro Corradi', '33-52033241-9'),
  ('SAPAC S.A.', 'Fiorasi', '30-59970938-6')
on conflict (cuit) do nothing;

-- Nota: los usuarios se crean primero en Supabase Auth (panel o invitación);
-- luego se insertan en la tabla "usuario" con el mismo id (auth.users.id),
-- y se les asignan roles en "usuario_rol" y empresas en "membresia_empresa".
-- Ver planes-ahorro/CLAUDE.md §12 (Cómo levantar) para el paso a paso.
