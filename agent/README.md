# Robot de sincronización Oliauto → Supabase

Proceso automático que **inicia sesión en Oliauto, descarga los reportes
(balance, mayor, etc.) y los carga en Supabase** usando el mismo motor de
cálculo que la app. Pensado para correr solo, por horario (cron).

> Estado: **esqueleto funcional**. El login y la carga a la base están listos.
> Falta confirmar, con tu paso a paso de Oliauto, **cómo se baja cada reporte**
> (la URL del reporte y el botón de "Exportar a Excel"). Eso se configura por
> variables de entorno, sin tocar código (ver abajo).

## Cómo está armado

```
agent/
  src/
    config.ts     · lee la configuración desde variables de entorno (secretos)
    oliauto.ts    · login + descarga de reportes con Playwright  ← parte a completar
    importer.ts   · lee el Excel y lo calcula (reusa src/lib del frontend)
    supabase.ts   · escribe en la tabla `importaciones` (service role)
    index.ts      · orquesta: login → por cada reporte → descargar → calcular → guardar
```

El cálculo (rentabilidad, situación patrimonial, mora, mayor) **no se duplica**:
se reutiliza `../src/lib/oliauto.ts` y `../src/lib/importCompute.ts`, los mismos
que usa la web.

## Probar local

1. **Requisito**: tener Supabase con el esquema creado (ver `../SUPABASE_SETUP.md`).
2. Instalar dependencias y el navegador:
   ```bash
   cd agent
   npm install
   npx playwright install chromium
   ```
3. Copiar `.env.example` como `.env` y completar:
   - credenciales de Oliauto (mejor un **usuario dedicado al robot**),
   - `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (la service role, **secreta**),
   - `EMPRESA_ID` de esta corrida.
4. **Ajustar los selectores** (la parte que depende de Oliauto):
   - Poné `OLIAUTO_HEADLESS=false` para ver el navegador.
   - Confirmá los selectores del login (`OLIAUTO_SEL_USER/PASS/SUBMIT`).
   - Para cada reporte, seteá la URL y el botón de exportar:
     `OLIAUTO_URL_MAYOR`, `OLIAUTO_EXPORT_MAYOR`, etc.
5. Correr:
   ```bash
   npm run sync
   ```

## Cómo obtener los selectores (sin saber programar)

1. Abrí Oliauto en Chrome y andá al reporte (ej.: el mayor).
2. Click derecho sobre el botón de **Exportar a Excel** → **Inspeccionar**.
3. En el panel que se abre, click derecho sobre la línea resaltada →
   **Copy → Copy selector**. Eso es el valor de `OLIAUTO_EXPORT_MAYOR`.
4. La URL del reporte es la que aparece en la barra de direcciones.

Si te resulta más cómodo, grabá un video corto navegando del login al export de
cada reporte y lo configuramos juntos.

## Producción (automático por horario)

Hay un workflow de GitHub Actions en `.github/workflows/oliauto-sync.yml` que
corre el robot por cron. Los valores sensibles van como **Secrets** del repo
(Settings → Secrets and variables → Actions), nunca en el código:

`OLIAUTO_URL`, `OLIAUTO_USER`, `OLIAUTO_PASS`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `EMPRESA_ID` y los `OLIAUTO_*_<REPORTE>` necesarios.

### Varias empresas

Cada empresa tiene su propio usuario/datos en Oliauto. Para sincronizar las 5,
se corre el robot una vez por empresa (con su `EMPRESA_ID` y credenciales). En el
workflow se puede usar una *matrix* — ver comentarios en el YAML.

## Notas importantes

- **Seguridad**: las credenciales viven solo como secretos del runner. La app web
  nunca las ve. El robot usa la *service role* de Supabase (servidor), distinta de
  la *anon key* del frontend.
- **Robustez**: como "usa" la pantalla de Oliauto, si Oliauto cambia el diseño
  puede romperse. Si Oliauto ofreciera una API o un export programado a una
  carpeta/mail, conviene migrar a eso (más estable).
