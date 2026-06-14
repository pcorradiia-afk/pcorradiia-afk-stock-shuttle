# Puente de WhatsApp Multi-Marca · Grupo Fiorasi

Módulo **independiente** (Python + FastAPI) que automatiza WhatsApp para las
concesionarias del grupo. Convive con el frontend React y con el agente de
sincronización del DMS, pero no depende de ellos: funciona como un "puente"
que recibe webhooks de Twilio, identifica la marca por el número de destino y
responde con la identidad y las reglas correctas de cada empresa.

> Estado: **Fase 1 — Diseño, entorno y skeleton multi-marca.**
> La IA es simulada (no consume tokens) hasta que actives `IA_ACTIVA=true`.

## Qué hace hoy

- **Webhook `/webhook`** que captura `From`, `To`, `Body` y `MessageSid`.
- **Enrutamiento en dos dimensiones: marca × línea de negocio**.
  Cada número (`To`) es una *Cuenta* = una marca + las líneas que atiende
  (Planes de ahorro, Venta de 0km, Posventa/Taller). Soporta el caso **mixto**:
  - número **dedicado** a una línea → ruteo directo (sin preguntar);
  - número **compartido** entre varias líneas → el bot muestra un menú de líneas
    y **recuerda** la elección del cliente.
- **System prompt de IA dinámico por marca Y por línea** (no es lo mismo el
  asistente de Planes de Pedro Corradi que el de 0km de Sapac).
- **Botonera de derivación humana** que pausa el bot y avisa al asesor de **esa
  línea** (planes ≠ ventas ≠ posventa).
- **Ventanas de horario** con respuesta empática fuera de hora.
- **Envío saliente de campañas** con plantilla aprobada (HSM): adjudicaciones de
  Planes de Ahorro, con **rate limiting** (1 envío por número cada 24 hs, por
  empresa) y **modo simulación (`dry_run`) por defecto** para probar sin gastar.
- **Normalización de teléfonos** de LatAm a formato internacional `+549...`.

## Persistencia (Supabase, opcional)

Por defecto el sistema guarda el estado **en memoria** (rate limit, sesiones,
pausas de bot, encuestas y resultados): práctico para desarrollo, pero se pierde
al reiniciar. Para que **sobreviva reinicios**, conectá Supabase:

1. En Supabase → **SQL Editor** → pegá y corré
   [`supabase/schema.sql`](./supabase/schema.sql) (crea las tablas `wsp_*`).
2. En tu `.env` completá (es backend → **service_role**, no la anon):
   ```
   SUPABASE_URL=https://TU-PROYECTO.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-secreta
   ```
3. Reiniciá el servidor. Listo: al arrancar verás
   `🗄️ [PERSISTENCIA] Usando Supabase`.

No cambia nada del uso: el código de negocio habla con un `Repositorio`
abstracto (`app/persistencia/`) que elige memoria o Supabase según la config.

## Estructura

```
whatsapp/
  app/
    main.py              · servidor FastAPI + ruta /webhook
    config.py            · configuración desde .env (tokens, keys)
    marcas.py            · REGISTRO de cuentas (número → marca × líneas)
                           Marca=identidad · ConfigLinea=comportamiento · Cuenta=número
    persistencia/        · capa conmutable: memoria o Supabase (mismo contrato)
      base.py            · interfaz Repositorio
      memoria.py         · backend en memoria (por defecto)
      supabase_repo.py   · backend Supabase (service_role)
    core/
      normalizacion.py   · números locales → +549 (E.164)
      horarios.py        · ¿la concesionaria está abierta?
      rate_limit.py      · prevención de duplicados (24 hs por empresa)
    services/
      enrutador.py       · resuelve la línea y aplica las reglas de negocio
      sesion.py          · recuerda la línea elegida (números multi-línea)
      ia.py              · Agente de IA (prompt por marca × línea) — simulado / Claude real
      twilio_client.py   · TwiML (menú de líneas + menú por línea) + envío saliente
      derivacion.py      · pausa del bot + alerta al asesor de la línea
      campanias.py       · campañas salientes (adjudicaciones, difusión stock)
      documentos.py      · multimedia: cupones de pago PDF + contratos por URL
      encuestas.py       · encuestas de calidad 48hs (enviar/capturar/tablero)
      scheduler.py       · envíos automáticos (APScheduler) sin cron externo
  data/
    empresa_pedro_corradi/   · datos simulados de la Marca A
    empresa_sapac/           · datos simulados de la Marca B
  requirements.txt
  .env.example
```

## Puesta en marcha (local)

1. **Instalar Python 3.11+** y crear un entorno virtual:
   ```bash
   cd whatsapp
   python -m venv .venv
   source .venv/bin/activate        # En Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. **Configurar el entorno**: copiá `.env.example` como `.env` y completá lo que
   tengas (en Fase 1 podés dejar Twilio e IA vacíos y probar igual).
   ```bash
   cp .env.example .env
   ```
3. **Levantar el servidor**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   Verificá la salud en http://localhost:8000/ — lista las marcas configuradas.
4. **Exponerlo a internet** para que Twilio lo alcance, con [ngrok](https://ngrok.com):
   ```bash
   ngrok http 8000
   ```
   Pegá la URL pública (`https://xxxx.ngrok-free.app/webhook`) en el campo
   *"When a message comes in"* del número de WhatsApp en la consola de Twilio.

## Probar el webhook sin Twilio

Simulá un mensaje a cada marca con `curl` (asegurate de tener
`TWILIO_VALIDAR_FIRMA=false` en el `.env`):

Los tres números de la demo muestran el escenario **mixto**:

| Número (`To`) | Empresa · Marca | Líneas que atiende |
|---|---|---|
| `+5493510000001` | Pedro Corradi · Volkswagen | **dedicado** a Planes de ahorro |
| `+5493510000002` | Pedro Corradi · Volkswagen | Venta de 0km + Posventa (multi-línea) |
| `+5493510000003` | Sapac · Toyota | Planes + Venta + Posventa (multi-línea) |

```bash
# Número DEDICADO a Planes → ruteo directo, IA con contexto de planes
curl -X POST http://localhost:8000/webhook \
  --data-urlencode "From=whatsapp:+5493515559999" \
  --data-urlencode "To=whatsapp:+5493510000001" \
  --data-urlencode "Body=cuando me adjudican el plan?" \
  --data-urlencode "MessageSid=SM_demo_1"

# Número MULTI-línea → primero el menú de líneas
curl -X POST http://localhost:8000/webhook \
  --data-urlencode "From=whatsapp:+5493515551111" \
  --data-urlencode "To=whatsapp:+5493510000002" \
  --data-urlencode "Body=hola" \
  --data-urlencode "MessageSid=SM_demo_2"

# El cliente elige una línea (ej. '2' = Posventa) → el bot la recuerda
curl -X POST http://localhost:8000/webhook \
  --data-urlencode "From=whatsapp:+5493515551111" \
  --data-urlencode "To=whatsapp:+5493510000002" \
  --data-urlencode "Body=2" \
  --data-urlencode "MessageSid=SM_demo_3"
```

> ⚠️ Usá `--data-urlencode` (no `-d`): con `-d`, curl interpreta el `+` del
> número como un espacio. Twilio sí lo envía bien.

Mirá la consola del servidor: vas a ver el log del mensaje, la cuenta y la línea
identificadas y, en el texto libre, el **system prompt que cambia según la marca
y la línea**.

## Campañas salientes (adjudicaciones de Planes de Ahorro)

Envío masivo con plantilla aprobada. Lee los destinatarios de
`data/<empresa>/adjudicaciones.json`, normaliza los teléfonos, aplica el rate
limiting y envía (o simula) la plantilla por Twilio.

```bash
# Simula la campaña (NO envía nada) y muestra el reporte. Seguro por defecto.
curl -X POST "http://localhost:8000/campanias/adjudicaciones/empresa_pedro_corradi"

# Corré el mismo comando otra vez: ahora salen todos como "duplicado"
# (rate limiting de 24 hs). El rate limit es independiente por empresa.

# Envío REAL (requiere credenciales de Twilio y la plantilla aprobada):
curl -X POST "http://localhost:8000/campanias/adjudicaciones/empresa_pedro_corradi?dry_run=false"
```

El reporte indica, por cada número: `enviado` / `simulado` / `duplicado` / `error`.
Las variables de la plantilla se completan desde los datos: `{{1}}` nombre,
`{{2}}` modelo, `{{3}}` fecha del acto.

### Difusión de stock (texto + imagen + botones)

Campaña de fidelización (caso #2): manda una foto de la unidad, un texto y
**botones de respuesta rápida**. Lee `data/<empresa>/difusion_stock.json`.

```bash
curl -X POST "http://localhost:8000/campanias/difusion/empresa_pedro_corradi"
```

El reporte incluye `con_imagen`, los `opciones` (botones) y una `vista_previa`
de cómo se ve el mensaje para cada cliente. La imagen y los botones viven en la
**plantilla aprobada**; el código la completa con la foto y los datos de cada
unidad.

Cuando el cliente **toca un botón**, su respuesta vuelve por el `/webhook`. Como
la campaña fue por la línea de Ventas, el sistema deja esa línea **cebada**: la
respuesta cae directo en Ventas sin volver a preguntar. Por ejemplo, tocar
*"Hablar con asesor"* dispara la derivación al equipo comercial de esa marca.

## Encuestas de calidad (48 hs · botones 1-5)

Ciclo completo: **enviar → capturar respuesta → guardar en el tablero**.

```bash
# 1) Enviar las encuestas cuyo evento ya cumplió 48 hs (un cron llamaría esto).
curl -X POST "http://localhost:8000/encuestas/empresa_pedro_corradi/enviar"

# 2) El cliente responde con un número del 1 al 5 (lo capturamos como puntaje).
curl -X POST "http://localhost:8000/webhook" \
  --data-urlencode "From=whatsapp:+5493515551234" \
  --data-urlencode "To=whatsapp:+5493510000002" \
  --data-urlencode "Body=5" --data-urlencode "MessageSid=E1"

# 3) Tablero de la empresa: respuestas, promedio y distribución 1-5.
curl "http://localhost:8000/encuestas/empresa_pedro_corradi/resultados"
```

- Los eventos (retiros/services) se leen de
  `data/<empresa>/encuestas_pendientes.json`; sólo se envían los que pasaron
  48 hs (`HORAS_ESPERA` en `encuestas.py`).
- Un puntaje **≤ 2** dispara un mensaje de seguimiento al cliente.
- **Las preguntas son provisionales**: el texto está en el diccionario
  `PREGUNTAS` (arriba de `app/services/encuestas.py`), separado de la lógica.
  Cuando tengas las definitivas, se edita sólo ahí (y se carga el mismo texto en
  la plantilla aprobada de WhatsApp).
- El envío lo dispara automáticamente el **scheduler** (ver abajo); igual podés
  forzarlo a mano con el endpoint `/encuestas/{empresa}/enviar`.

## Multimedia: cupones de pago (PDF) y contratos

Dos formas de mandar documentos, según la regla de las 24 hs de WhatsApp:

```bash
# Campaña de cupones de pago en PDF (inicia conversación → plantilla aprobada).
# Lee data/<empresa>/cupones.json. Con rate limiting (no reenvía en 24 hs).
curl -X POST "http://localhost:8000/documentos/cupones/empresa_pedro_corradi"

# Envío individual de un contrato a un cliente YA en conversación (multimedia libre).
curl -X POST "http://localhost:8000/documentos/enviar/empresa_pedro_corradi/ventas\
?telefono=+5493515551234&url=https://.../contrato.pdf&cuerpo=Tu+contrato"
```

En la plantilla del cupón, el PDF es la variable `{{1}}`, `{{2}}`=nombre,
`{{3}}`=período.

## Scheduler (envíos automáticos)

El sistema trae un scheduler integrado (APScheduler) que corre **dentro de la
app**, sin depender del cron del sistema operativo. Cada cierto intervalo
recorre las empresas con Posventa y manda las encuestas que ya cumplieron 48 hs
(la dedupe evita reenviar). Así el flujo funciona solo.

```bash
curl "http://localhost:8000/scheduler"   # estado: activo, intervalo, próxima corrida
```

Se configura en el `.env`:

```
SCHEDULER_ACTIVO=true            # encender/apagar el scheduler
SCHEDULER_INTERVALO_MIN=60       # cada cuántos minutos revisa
ENCUESTAS_DRY_RUN=true           # true = simula (seguro); false = envía de verdad
```

Arranca apenas levantás el server (corre una vez al instante y después cada
intervalo). En modo `dry_run` simula los envíos pero igual deja la encuesta lista
para capturar la respuesta, así podés probar todo el circuito.

## Próximos pasos (Fase 2)

- **Conectar Twilio + WhatsApp**: ver la guía paso a paso en
  [`TWILIO_SETUP.md`](./TWILIO_SETUP.md) (crear plantillas, pegar los `HX...` y
  los números reales, encender los envíos).
- Reemplazar el registro de `marcas.py` y la persistencia por Supabase (ver
  [`supabase/schema.sql`](./supabase/schema.sql)).
