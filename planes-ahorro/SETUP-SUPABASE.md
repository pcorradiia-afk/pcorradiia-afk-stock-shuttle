# Conectar la base de datos real (Supabase) — guía paso a paso

Cuando termines estos pasos, el sistema deja el "modo demo" y pasa a ser
**multiusuario de verdad**: todos ven los mismos datos, cada uno con su
contraseña, y la información queda guardada en la nube.

Tiempo estimado: **15 minutos**. Todo se hace con clics y copiando/pegando.

---

## Paso 1 — Crear el proyecto en Supabase (una sola vez)

1. Entrá a **https://supabase.com** → **Start your project** → creá una cuenta
   (podés usar "Continue with GitHub", la misma cuenta del repositorio).
2. **New project**:
   - **Name:** `planes-ahorro`
   - **Database password:** inventá una y **guardala** (es la clave maestra de la base).
   - **Region:** `South America (São Paulo)`.
3. Esperá 1–2 minutos a que el proyecto se cree.

## Paso 2 — Crear las tablas (pegar el script)

1. En el menú de la izquierda: **SQL Editor** → **New query**.
2. Abrí el archivo **`supabase/migrations/0001_esquema_completo.sql`** de este
   repositorio (en GitHub: carpeta `planes-ahorro/supabase/migrations/`),
   copiá TODO su contenido y pegalo en el editor.
3. Botón **Run**. Tiene que decir "Success". (Se puede correr de nuevo sin problema.)

## Paso 3 — Crear tu usuario (el super admin)

1. Menú izquierdo: **Authentication → Users → Add user → Create new user**.
   - Email: `fernandobogliacino@gmail.com` (o el que uses)
   - Password: tu contraseña
   - ✅ Tildá **Auto Confirm User**.
2. Volvé a **SQL Editor** y ejecutá (ajustá el email si usaste otro):

```sql
select alta_usuario(
  'fernandobogliacino@gmail.com',  -- email (el mismo del paso anterior)
  'Fernando Bogliacino',           -- nombre
  'pc',                            -- empresa principal: 'pc' o 'sapac'
  array['super_admin'],            -- roles
  'concesionario',                 -- tipo de perfil
  null,                            -- gestión (solo terciarizadas)
  array['sapac']                   -- otras empresas a las que accede
);
```

Debe responder `OK: …`. **Ese es tu login.**

### Para dar de alta a cada empleado (repetir por persona)

1. **Authentication → Users → Add user** (email + contraseña + Auto Confirm).
2. **SQL Editor**:

```sql
-- Ejemplos de roles: recepcion, vendedor, supervisor_ventas, administracion,
-- supervisor_administracion, entregas, analista_suscripciones, gerencia
select alta_usuario('maria@pedrocorradi.com.ar', 'María Pérez', 'pc', array['administracion']);
select alta_usuario('juan@pedrocorradi.com.ar',  'Juan Gómez',  'pc', array['vendedor']);
-- Una terciarizada (solo ve los clientes de su gestión):
select alta_usuario('ventas@terciarizada.com', 'Estudio XYZ', 'sapac', array['administracion'], 'terciarizada', 'gestion-xyz');
```

> Para cambiar una contraseña: Authentication → Users → (los tres puntitos) → Reset password.

## Paso 4 — Conectar la app publicada (Vercel)

1. En Supabase: **Project Settings → API**. Copiá dos valores:
   - **Project URL** (ej. `https://abcd1234.supabase.co`)
   - **anon public** key (un texto largo).
2. En **Vercel** → proyecto `planes-ahorro` → **Settings → Environment Variables** → agregá:
   - `NEXT_PUBLIC_SUPABASE_URL` = la URL del punto anterior
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = la anon key
3. **Deployments → ⋯ → Redeploy** en el último deployment.

## Paso 5 — Probar

1. Abrí la app (planes-ahorro-mauve.vercel.app). El login ahora pide **contraseña**
   (la lista de usuarios demo desaparece).
2. Entrá con tu email y contraseña del Paso 3.
3. Importá la cartera (Novedades) — ahora queda **en la nube**: cualquier otro
   usuario que entre desde cualquier computadora la ve.

---

## Preguntas frecuentes

- **¿Qué pasa con los datos que cargué en el modo demo?** Quedan en cada navegador,
  no se migran solos. Lo simple: reimportar los archivos (Novedades, etc.) una vez
  conectado — es un minuto.
- **¿La anon key es secreta?** No: está pensada para usarse en el navegador. La
  seguridad la aplican las reglas de la base (RLS) por usuario.
- **¿Y la Database password / service_role key?** Esas SÍ son secretas. No las pongas
  en Vercel ni las compartas.
- **¿Cómo doy de baja a alguien?** SQL Editor:
  `update usuario set activo = false where email = 'persona@empresa.com';`
