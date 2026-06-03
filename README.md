# ⚽️🏆 Prode Mundial 2026

App web (instalable en el celu como PWA) para hacer el **prode del Mundial
2026 entre amigos**, con tabla de posiciones en vivo, pronósticos especiales,
puntos por asados del grupo y reparto del pozo.

Pensada para ~14 jugadores que ponen plata: **el 1º se lleva el 70% del pozo y
el 2º el 30%**.

## 🧮 Cómo se suman los puntos

| Acierto | Puntos |
|---|---|
| Resultado del partido (gana / empata / pierde) | **4** |
| Marcador exacto (los goles justos) | **6** *(reemplaza al de 4, no se suman)* |
| Campeón del mundo | **40** |
| Mejor jugador del Mundial | **10** |
| Goleador del Mundial | **10** |
| Participar de un asado del grupo (mín. 4 comensales) | **5** |
| Poner la sede del asado | **+10** |

> Los pronósticos de cada partido **se cierran solos cuando el partido empieza**
> (no se pueden cargar ni cambiar después del pitazo inicial). Los pronósticos
> Plus (campeón / jugador / goleador) se cierran en la fecha que ponga el admin.
> Las reglas se pueden ajustar en `src/data/rules.ts`.

## 🚀 Puesta en marcha (1 sola vez)

La app guarda todo en **Supabase** (base de datos gratis) para que los 14 jueguen
desde su propio celular y vean la misma tabla.

### 1) Crear el proyecto de Supabase

1. Entrá a [supabase.com](https://supabase.com) → **New project** (plan Free).
2. Elegí nombre y contraseña (la de la base, guardala).

### 2) Crear las tablas

1. En Supabase, abrí **SQL Editor → New query**.
2. Copiá y pegá **todo** el contenido de [`supabase/schema.sql`](supabase/schema.sql).
3. Apretá **Run**. Listo: quedan creadas las tablas y la seguridad (RLS).

### 3) Conectar la app con tus claves

1. En Supabase: **Project Settings → API** y copiá:
   - **Project URL**
   - **anon public** key
2. En el proyecto, copiá `.env.example` a `.env` y completá:

   ```env
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

### 4) Correr en local

```bash
npm install
npm run dev      # abre en http://localhost:8080
```

Entrá con tu email (te llega un **link mágico**, sin contraseñas), poné tu
nombre y ya estás adentro.

### 5) Hacerte admin

Después de loguearte **al menos una vez**, en Supabase → **SQL Editor**, corré
(con tu email):

```sql
update public.profiles
set is_admin = true
where id = (select id from auth.users where email = 'TU_EMAIL@AQUI.com');
```

Volvé a abrir la app: te aparece el **Panel de administración**.

## 🛠️ Lo que hace el admin

Desde el panel (icono de escudo en Inicio/Perfil):

- **Partidos**: cargar los partidos (fase, grupo, equipos, día y hora) y, cuando
  terminan, **cargar el resultado**. Apenas lo guardás, se reparten los puntos.
- **Plus**: al final del Mundial, cargar el **campeón, mejor jugador y goleador**
  oficiales.
- **Pozo**: poner el **valor de la entrada** y la moneda, marcar quién pagó (el
  pozo se calcula con los que pagaron) y la **fecha de cierre** de los pronósticos
  Plus.
- **Gente**: marcar pagos, hacer admin a otro, y **validar los asados** (confirmar
  que tuvieron 4+ comensales para que sumen).

> **Tip sobre los partidos:** el fixture real con los cruces se sortea poco antes
> del Mundial. Por eso los partidos se cargan a mano desde el panel (rápido: elegís
> los dos equipos de la lista de 48 selecciones ya cargada y la fecha/hora).

## 📲 Que tus amigos la usen (sin tienda de apps)

La forma más rápida es **PWA**:

1. Subí la app a un hosting estático gratis (Vercel, Netlify, Cloudflare Pages…).
   - **Importante:** cargá las 2 variables `VITE_SUPABASE_URL` y
     `VITE_SUPABASE_ANON_KEY` en el panel del hosting y volvé a deployar.
2. Pasale el link al grupo de WhatsApp.
3. Cada uno abre el link en Chrome → menú ▸ **"Agregar a pantalla de inicio"**.
   Queda como una app, a pantalla completa.

### Deploy en Vercel (ejemplo)

```bash
npm i -g vercel
vercel            # seguí los pasos
# luego cargá las env vars en el panel de Vercel y: vercel --prod
```

## 🤖 (Opcional) Publicar en Google Play

El proyecto ya trae **Capacitor** configurado.

```bash
npm run android:init   # primera vez: crea la carpeta android/
npm run android:sync   # cada vez que cambiás código
npm run android:open   # abre Android Studio
```

En Android Studio: **Build ▸ Generate Signed Bundle / APK**. Para uso entre
amigos alcanza con **"Pruebas internas"** (no requiere revisión pública) o
generar un APK y mandarlo por WhatsApp.

## 🔒 Sobre la seguridad

- Login por **email + link mágico** (Supabase Auth). Nadie comparte contraseñas.
- **RLS (Row Level Security)** activado: cada uno sólo puede tocar sus propios
  pronósticos, y **los pronósticos ajenos recién se ven cuando el partido empezó**
  (no se pueden copiar). Sólo el admin carga resultados y valida asados.

## 🧱 Tecnologías

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (Postgres + Auth) con `@tanstack/react-query`
- PWA instalable / Capacitor para Android

## 📁 Estructura

```
supabase/schema.sql        # tablas + seguridad (pegar en Supabase)
src/
  data/
    teams.ts               # 48 selecciones (bandera + nombre)
    rules.ts               # puntajes y reparto del pozo (editable)
  lib/
    supabase.ts            # cliente
    scoring.ts             # cálculo de puntos y tabla
    format.ts              # plata y fechas
  store/
    auth.tsx               # sesión y perfil
    queries.ts             # lecturas y mutaciones (react-query)
  components/
    MatchCard.tsx          # tarjeta de partido (cargar marcador / ver puntos)
    TeamSelect.tsx, Avatar.tsx, AppHeader.tsx, BottomNav.tsx
  pages/
    Login.tsx, Onboarding.tsx, SetupGuide.tsx
    Dashboard.tsx          # inicio
    Matches.tsx            # partidos
    Specials.tsx           # pronósticos Plus
    Asados.tsx             # asados del grupo
    Leaderboard.tsx        # tabla + pozo
    Rules.tsx              # reglas y reparto
    Admin.tsx              # panel de administración
    Profile.tsx
```

## ✏️ Cambiar las reglas

Editá `src/data/rules.ts` (puntos, mínimo de comensales, reparto del pozo) y
volvé a deployar. Toda la app y el cálculo usan esos valores.
