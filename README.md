# ⚽️🏆 Prode Mundial 2026

App web (instalable en el celu como PWA) para hacer el **prode del Mundial
2026 entre amigos**, con tabla de posiciones en vivo, pronósticos especiales,
puntos por asados del grupo y reparto del pozo.

Pensada para ~14 jugadores que ponen plata: **el 1º se lleva el 70% del pozo y
el 2º el 30%**. Funciona igual de bien en el **celular** (barra inferior) y en la
**computadora** (menú lateral), con el look del Mundial 2026.

> El grupo es **«Opacos desde la cuna!!!»** — aparece en el encabezado de toda la
> app. Lo podés cambiar en `src/data/brand.ts`.

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

- **Partidos**: con un botón **cargás de una los 72 partidos de la fase de grupos**
  (los 12 grupos oficiales ya vienen cargados, con horarios estimados editables).
  También podés agregar partidos sueltos (ej.: los de eliminación cuando se definan)
  y, cuando terminan, **cargar el resultado**. Apenas lo guardás, se reparten los
  puntos.
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

## 🔄 Resultados automáticos (opcional pero recomendado)

En vez de cargar los resultados a mano, la app puede traerlos sola desde una API
de fútbol gratuita ([football-data.org](https://www.football-data.org/)) y
actualizar la tabla cada 15 minutos. **El admin igual puede corregir cualquier
partido a mano** (red de seguridad si la API tarda o nombra raro a un equipo).

### 1) Sacá la API key (gratis)

1. Registrate en [football-data.org/client/register](https://www.football-data.org/client/register).
2. Te llega por mail tu **API token** (una línea de letras y números).

### 2) Subí la función a Supabase

Necesitás el [CLI de Supabase](https://supabase.com/docs/guides/cli) una sola vez:

```bash
npm i -g supabase
supabase login
supabase link --project-ref <TU_PROJECT_REF>   # está en Project Settings → General

# cargá tu API key como secreto (queda en el server, nunca en el celular)
supabase secrets set FOOTBALL_API_KEY=tu_token_aca

# subí la función
supabase functions deploy sync-results --no-verify-jwt
```

> El Mundial 2026 en football-data.org tiene el código de competición **`WC`**
> (ya es el default). Si usaran otro, se setea con
> `supabase secrets set FOOTBALL_COMPETITION=XXX`.

### 3) Programá el cron (cada 15 min)

En Supabase → **SQL Editor**, pegá [`supabase/cron.sql`](supabase/cron.sql)
reemplazando `<PROJECT_REF>` y `<ANON_KEY>` por los tuyos, y dale Run.

### Listo

- Desde el **panel de admin → Pozo → "Resultados automáticos"** podés
  **prenderlo/apagarlo**, ver el **último sync** y forzar un **"Sincronizar ahora"**.
- Cómo empareja los partidos: por el **par de equipos** (no por el horario), así
  que aunque los horarios estimados no coincidan con los reales, igual carga bien
  el resultado. Si algún equipo no matchea por el nombre, agregalo en el mapa
  `NAME_TO_CODE` dentro de `supabase/functions/sync-results/index.ts`.

## 📲 Que tus amigos la usen (sin tienda de apps)

La forma más rápida es **PWA**:

1. Subí la app a un hosting estático gratis (Vercel, Netlify, Cloudflare Pages…).
   - **Importante:** cargá las 2 variables `VITE_SUPABASE_URL` y
     `VITE_SUPABASE_ANON_KEY` en el panel del hosting y volvé a deployar.
2. Pasale el link al grupo de WhatsApp.
3. Cada uno abre el link en Chrome → menú ▸ **"Agregar a pantalla de inicio"**.
   Queda como una app, a pantalla completa.

### Deploy en Vercel (paso a paso)

**Opción A — desde la web (la más fácil):**

1. Entrá a [vercel.com](https://vercel.com) y registrate con tu cuenta de GitHub.
2. **Add New… → Project** → importá el repo `pcorradiia-afk-stock-shuttle`.
3. En **Production Branch** elegí `claude/world-cup-prode-app-eJAeY` (o mergeá esa
   rama a `main` antes). Framework: Vite (lo detecta solo).
4. Abrí **Environment Variables** y cargá las 2:
   - `VITE_SUPABASE_URL` = tu Project URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` = tu anon public key
5. **Deploy**. En ~1 min tenés el link (algo como `https://prode-xxxx.vercel.app`).
6. Pasale ese link al grupo de WhatsApp. 🎉

**Opción B — desde la terminal:**

```bash
npm i -g vercel
vercel link
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel --prod
```

> 🔎 **Ver la app sin configurar nada:** agregá **`?demo`** al final del link
> (ej. `https://tu-app.vercel.app/?demo`) y entra con datos de ejemplo, sin login.
> Útil para mostrarle la app al grupo antes de tener todo listo.
>
> ⚠️ No cargues `VITE_DEMO` en Vercel: en producción querés los datos reales de
> Supabase (el `?demo` alcanza para mostrar el ejemplo cuando lo necesites).

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
