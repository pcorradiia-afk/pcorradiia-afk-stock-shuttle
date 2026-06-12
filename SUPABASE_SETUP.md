# Conectar Supabase (persistencia) · Grupo Fiorasi

Guía paso a paso para que las importaciones se **guarden en una base en la nube**
y queden disponibles para todos los usuarios. No hace falta saber programar.

> Mientras no configures Supabase, la app sigue funcionando igual que hasta ahora
> (modo demo, sin guardar). Al cargar las credenciales, se habilita el botón
> **"Guardar en la base"** en la pantalla de Importar.

---

## 1. Crear el proyecto en Supabase

1. Entrá a <https://supabase.com> → **Start your project** → registrate (gratis).
2. **New project**:
   - **Name**: `fiorasi-control` (el que quieras).
   - **Database password**: poné una y guardala.
   - **Region**: `South America (São Paulo)` (la más cercana).
3. Esperá ~2 minutos a que el proyecto termine de crearse.

## 2. Crear las tablas

1. En el menú izquierdo: **SQL Editor** → **New query**.
2. Abrí el archivo [`supabase/schema.sql`](./supabase/schema.sql) de este repo,
   copiá **todo** su contenido y pegalo en el editor.
3. Apretá **Run** (abajo a la derecha). Debería decir *Success*.
   - Esto crea las tablas `empresas` (ya cargada con las 5 del grupo) e
     `importaciones`, con sus permisos.
   - Es seguro correrlo más de una vez.

## 3. Copiar las credenciales

1. Menú izquierdo: **Project Settings** (el engranaje) → **API**.
2. Anotá dos datos:
   - **Project URL** → algo como `https://abcdxyz.supabase.co`
   - **anon public** (en *Project API keys*) → una clave larga.

> ⚠️ Usá solo la clave **anon public**. La `service_role` **nunca** va en el frontend.

## 4. Cargar las credenciales

### Para probar en tu compu (local)

1. Copiá el archivo `.env.example` como `.env` en la raíz del proyecto.
2. Completá:
   ```
   VITE_SUPABASE_URL=https://abcdxyz.supabase.co
   VITE_SUPABASE_ANON_KEY=la-clave-anon-public
   ```
3. Reiniciá `npm run dev`.

### Para producción (Vercel)

1. En Vercel → tu proyecto → **Settings** → **Environment Variables**.
2. Agregá las dos variables (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`)
   con los mismos valores.
3. **Redeploy** el proyecto para que tomen efecto.

## 5. Probar

1. Entrá a **Importar del DMS** y cargá un balance parcial o una composición de saldos.
2. Elegí la **empresa** y apretá **Guardar en la base**.
3. En Supabase → **Table Editor** → `importaciones` deberías ver la fila guardada.

---

## Seguridad: importante para antes de salir a producción

En esta primera versión, las políticas de la base permiten leer y escribir con la
**anon key** (que es pública porque viaja en el navegador). Es práctico para
empezar a usarlo de forma interna, **pero cualquiera con la URL y la anon key
podría leer/escribir** la tabla de importaciones.

Antes de exponer la app a internet conviene migrar a **Supabase Auth**:
los usuarios inician sesión de verdad y las políticas (RLS) se basan en
`auth.uid()` y en la empresa asignada a cada uno. Ese es el siguiente paso
natural una vez que confirmemos que la persistencia funciona — avisame y lo armamos.

---

## 6. Usuarios reales (autenticación)

Con las variables cargadas, la app pasa automáticamente a **login con email y
contraseña**. Para dar de alta a alguien:

1. Supabase → **Authentication → Users → Add user → Create new user**:
   email + contraseña (marcá *Auto Confirm User*).
2. Supabase → **Table Editor → `perfiles` → Insert row**:
   - `email`: el mismo email (en minúsculas)
   - `nombre`: nombre y apellido
   - `rol_id`: `superadmin` · `direccion` · `controller` · `auditor` · `responsable`
   - `scope`: `grupo` (ve todo) o `empresas` (solo las asignadas)
   - `empresa_ids`: ej. `{e1,e3}` si scope=empresas
3. Listo: esa persona ya puede entrar. Sin fila en `perfiles` (o con `activo=false`),
   el login se rechaza aunque la contraseña sea correcta.

> El administrador inicial (`fernandobogliacino@gmail.com`) queda sembrado como
> superadmin por el schema.sql — creale el usuario en Authentication con ese email.
