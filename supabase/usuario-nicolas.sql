-- ---------------------------------------------------------------------------
-- Alta de Nicolás Romero (control de gestión · IA y automatización)
--
-- IMPORTANTE: este SQL crea SOLO el PERFIL. La credencial de acceso (email +
-- contraseña) se crea aparte, a mano, en:
--   Supabase → Authentication → Users → Add user
--   email: nicolas.romero.dit@gmail.com   (marcá "Auto Confirm User")
--
-- Recién después de crear el usuario en Authentication, corré este INSERT en el
-- SQL Editor para que la app lo reconozca y le dé sus accesos.
-- ---------------------------------------------------------------------------

insert into public.perfiles (email, nombre, rol_id, scope, empresa_ids, cargo, activo)
values (
  'nicolas.romero.dit@gmail.com',
  'Nicolás Romero',
  'controller',   -- rol: importar, analizar y armar tableros. Cambiá a 'superadmin' si querés que administre usuarios/empresas.
  'grupo',        -- alcance: ve todas las empresas del grupo.
  '{}',           -- si scope = 'empresas', poné acá los ids, ej: '{e1,e2}'. Con scope 'grupo' se ignora.
  'Control de gestión · IA y automatización',
  true
)
on conflict (email) do update set
  nombre      = excluded.nombre,
  rol_id      = excluded.rol_id,
  scope       = excluded.scope,
  empresa_ids = excluded.empresa_ids,
  cargo       = excluded.cargo,
  activo      = excluded.activo;
