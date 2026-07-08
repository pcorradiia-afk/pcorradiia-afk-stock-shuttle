# Onboarding — Sistema de Control y Gestión Grupo Fiorasi

Guía para incorporarte al desarrollo del sistema. Si podés leer esto es porque
ya tenés acceso al repositorio. Seguí los pasos en orden y en ~15 minutos tenés
el proyecto corriendo en tu máquina.

> **Bienvenido, Nicolás** 👋 — cualquier duda que no cubra este doc, preguntá.

---

## 1. Qué es este sistema

App web **multiempresa y multiusuario** de control, auditoría y análisis de
gestión para las 5 concesionarias del grupo (Pedro Corradi, Automotores Fiorasi
y Corradi, Fiorasi, Fiorasi Motors, Sapac).

Importa los reportes del DMS **Oliauto** (balance parcial, balance general,
mayor, composición de saldos) en Excel y arma un **estado de resultados
totalmente parametrizable** por departamento y por línea del EERR, más ventas,
márgenes, cuentas corrientes/mora y auditoría.

- **Stack:** React + Vite + TypeScript + Tailwind + shadcn/ui + Recharts + SheetJS (`xlsx`).
- **Backend:** Supabase (PostgreSQL + Auth + RLS).
- **Deploy:** Vercel. `main` = **Producción**.

El plan completo del sistema está en [`docs/PLAN.md`](PLAN.md).

---

## 2. Requisitos

- **Node.js 18+** y npm.
- Una cuenta de **GitHub** (usuario `Romer77`, ya invitado al repo).
- Acceso al proyecto de **Supabase** (te pasan URL + anon key, ver paso 4).

---

## 3. Clonar y arrancar

```bash
git clone https://github.com/pcorradiia-afk/pcorradiia-afk-stock-shuttle.git
cd pcorradiia-afk-stock-shuttle
npm install
npm run dev        # http://localhost:8080
```

Sin variables de entorno la app corre en **modo demo** (datos ficticios, sin
persistencia). Para trabajar contra los datos reales, seguí el paso 4.

Scripts útiles:

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con hot-reload |
| `npm run build` | Compila a `/dist` (lo mismo que corre en Vercel) |
| `npm run preview` | Sirve el build de producción localmente |
| `npm run lint` | ESLint |

Antes de pushear, que **`npm run build` pase sin errores** — es lo que valida Vercel.

---

## 4. Variables de entorno (Supabase)

Copiá el ejemplo y completá con los datos que te pasa Fernando:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

> 🔐 **Regla de oro:** en el frontend va **solo** la `anon` / publishable key.
> La `service_role` / secret key **NUNCA** se pone en el código, ni en el `.env`
> del front, ni se comparte por chat. Solo la usa el robot del lado servidor.

El `.env` **no se commitea** (está en `.gitignore`). Cada uno tiene el suyo.

---

## 5. Tu usuario para entrar a la app

Además del acceso al código, necesitás un login propio en la app. Fernando lo
crea en dos pasos dentro de Supabase (ver el SQL más abajo):

1. **Authentication → Users → Add user** → tu email + una contraseña.
2. Una fila en la tabla **`perfiles`** con tu email, rol y alcance.

Con eso ya entrás con email + contraseña en la URL de Producción.

---

## 6. Flujo de trabajo con Git (importante)

**Nunca se pushea directo a `main`.** `main` es Producción y se publica sola en
Vercel. El flujo es:

```bash
# 1. Partí siempre de main actualizado
git checkout main
git pull origin main

# 2. Creá tu rama de trabajo
git checkout -b claude/nicolas-<lo-que-estes-haciendo>

# 3. Trabajá, commiteá
git add -A
git commit -m "Descripción clara del cambio"

# 4. Subí tu rama
git push -u origin claude/nicolas-<...>

# 5. Abrí un Pull Request contra main desde GitHub
```

- Un PR por cambio, con descripción de qué y por qué.
- Que **`npm run build` pase** antes de pedir merge.
- El merge a `main` (= publicar a Producción) lo confirma Fernando.

---

## 7. Mapa del código

```
src/
  auth/         RBAC + AuthContext (login real Supabase / demo)
  components/   layout (AppShell, selector de empresa) + ui-kit + ui/ (shadcn)
  data/         stores local-first + sync a la nube + selectores de consulta
  lib/          parsers de Oliauto (oliauto.ts) + motor de cálculo (importCompute.ts)
  pages/        Login, Dashboard, Rentabilidad (Análisis de gestión), Comercial,
                Cuentas corrientes, Auditoría, Importar, admin/(Empresas,
                Usuarios, Roles, PlanCuentas)
  types/        modelo de dominio
supabase/
  schema.sql    tablas, seeds y RLS (correr en el SQL Editor de Supabase)
agent/          robot Playwright para auto-descarga de Oliauto (scaffold)
```

Piezas clave a conocer:

- **`src/lib/oliauto.ts`** — parsers de los 4 reportes de Oliauto. Guarda el
  detalle por cuenta contable (número, descripción, saldos por período).
- **`src/lib/importCompute.ts`** — motor de cálculo puro, reutilizado en el
  navegador y en el robot (Node).
- **`src/data/importedSelectors.ts`** — arma el cuadro de gestión aplicando la
  parametrización por cuenta (departamento, línea del EERR y reparto entre
  departamentos por % de ventas o % fijo).
- **`src/data/clasificacionCuentas.ts`** + **`src/pages/admin/PlanCuentas.tsx`**
  — parametrización cuenta por cuenta.
- **Invariante de conciliación:** el total del resultado nunca cambia al
  reparametrizar (los pesos suman 1 por período). Referencia de prueba:
  Pedro Corradi, mayo → resultado total = `$881.326.518`.

---

## 8. En qué podés arrancar

Tareas pendientes que encajan con tu perfil (IA + automatización):

- **🤖 Robot de Oliauto** (`agent/`): auto-descarga del balance/mayor y auto-
  import. Está scaffoldeado (login resuelto); falta completar la descarga de
  cada reporte (selectores de export) y el disparo programado.
- **Soporte Autologica/Sapac:** Sapac usa otro DMS; falta un export de muestra
  para escribir su parser.

Antes de tocar algo grande, alineá con Fernando por dónde entrar.

---

## 9. Contactos

- **Fernando Bogliacino** — Dirección / dueño del proyecto.
- **Diego** — colaborador (desarrollo).
- **Nicolás Romero** — control de gestión, IA y automatización.
