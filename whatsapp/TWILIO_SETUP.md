# Conectar Twilio + WhatsApp · Puente del Grupo Fiorasi

Guía paso a paso para conectar el sistema a WhatsApp **de verdad**. No hace falta
saber programar: es todo configuración (crear cuenta, plantillas y pegar unos
códigos en dos archivos).

> Mientras no configures Twilio, el sistema funciona en **modo simulación**
> (`dry_run`): podés probar todos los flujos sin enviar nada. Esta guía es para
> cuando quieras pasar a envíos reales.

---

## Panorama: qué vamos a hacer

1. Crear la cuenta de Twilio y activar WhatsApp.
2. Copiar las credenciales al `.env`.
3. Apuntar el webhook de Twilio a nuestro `/webhook`.
4. Crear las **plantillas aprobadas** (las que llevan imagen y botones).
5. Pegar los códigos de plantilla (`HX...`) y los números reales en `marcas.py`.
6. Encender los envíos reales.

> ⏱️ **Tené en cuenta**: las plantillas de WhatsApp las tiene que **aprobar Meta**
> (suele tardar de unas horas a 1-2 días). Conviene crearlas primero y, mientras
> se aprueban, ir avanzando con lo demás.

---

## Paso 1 · Crear la cuenta y activar WhatsApp

1. Entrá a <https://www.twilio.com/try-twilio> y registrate.
2. En el menú: **Messaging → Try it out → Send a WhatsApp message**.
3. Para **probar rápido**: Twilio te da un **Sandbox** (un número compartido).
   Seguí las instrucciones para "unir" tu celular enviando un código por WhatsApp.
   Sirve para ver todo funcionando antes de tener los números oficiales.
4. Para **producción**: en **Messaging → Senders → WhatsApp senders** se solicita
   el alta de tus números oficiales de WhatsApp Business (uno por concesionaria).
   Este trámite lo hace Twilio con Meta; te van pidiendo datos de la empresa.

> 💡 Estrategia recomendada: armá y aprobá todo en el **Sandbox** primero. Cuando
> esté redondo, pedís los números de producción y solo cambiás los números y los
> códigos de plantilla.

---

## Paso 2 · Copiar las credenciales al `.env`

1. En el **Console** de Twilio (pantalla principal), copiá:
   - **Account SID** (empieza con `AC...`)
   - **Auth Token** (apretá el ojito para verlo)
2. En la carpeta `whatsapp/`, copiá `.env.example` como `.env` y completá:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=tu-auth-token
   TWILIO_VALIDAR_FIRMA=false
   ```

> 🔐 El Auth Token es secreto. El `.env` **no se sube** al repositorio (ya está
> en `.gitignore`).

---

## Paso 3 · Apuntar el webhook a nuestro `/webhook`

Twilio necesita una **URL pública** a la que avisarle cuando llega un mensaje.

### Para probar en tu compu

1. Levantá el servidor:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
2. En otra terminal, exponé el puerto con [ngrok](https://ngrok.com):
   ```bash
   ngrok http 8000
   ```
   Te da una URL tipo `https://xxxx.ngrok-free.app`.
3. En Twilio:
   - **Sandbox**: **Messaging → Try it out → WhatsApp Sandbox Settings** → campo
     **"When a message comes in"** → pegá `https://xxxx.ngrok-free.app/webhook`,
     método **POST**. Guardá.
   - **Número de producción**: en el **WhatsApp Sender** correspondiente, el mismo
     campo **"When a message comes in"** → la URL pública de tu servidor + `/webhook`.

### En producción

El servidor tiene que estar publicado (no en tu compu). La URL será algo como
`https://wsp.fiorasi.com/webhook`. Ese mismo valor va en cada Sender.

> El `/webhook` ya está listo para recibir `From`, `To`, `Body` y `MessageSid`,
> identificar la marca por el número de destino y responder. No hay que tocar nada.

---

## Paso 4 · Crear las plantillas aprobadas

Las campañas **inician** la conversación, así que WhatsApp exige una **plantilla
aprobada** (con su imagen y botones definidos adentro). Se crean en:

**Messaging → Content Template Builder → Create new**

Vas a crear estas plantillas (una por cada función). Anotá el **código `HX...`**
de cada una: lo vas a pegar en `marcas.py` (Paso 5).

> 🔢 **Importante — el orden de las variables**: las variables `{{1}}`, `{{2}}`...
> de cada plantilla tienen que ir **en el orden exacto** que se indica abajo,
> porque el código las completa en ese orden.

### 4.1 · Adjudicaciones de Planes (texto)

- **Content type**: *Text*.
- **Variables**: `{{1}}` = nombre, `{{2}}` = modelo, `{{3}}` = fecha del acto.
- **Ejemplo de cuerpo**:
  > ¡Hola {{1}}! 🎉 Te adjudicaron tu {{2}}. El acto de entrega es el {{3}}.
  > Te esperamos para coordinar los próximos pasos.
- Sin botones.

### 4.2 · Difusión de stock (imagen + texto + botones)

- **Content type**: *Card* (permite imagen de encabezado + botones).
- **Header / Media**: imagen, usando la variable `{{1}}` (la URL la pone el sistema).
- **Variables del cuerpo**: `{{2}}` = nombre, `{{3}}` = modelo.
- **Ejemplo de cuerpo**:
  > ¡Hola {{2}}! 🚗 Tenemos esta {{3}} 0km lista para entrega. ¿Querés más info?
- **Botones (Quick reply)**, en este orden:
  1. `Me interesa`
  2. `Ver financiación`
  3. `Hablar con asesor`

### 4.3 · Encuesta de calidad (puntaje 1-5)

WhatsApp permite **máximo 3 botones** de respuesta rápida, así que para el 1-5
hay dos opciones:

- **Opción A (recomendada)**: *List Picker* con 5 filas: `1`, `2`, `3`, `4`, `5`.
- **Opción B (más simple)**: *Text*, pidiendo que respondan con un número del 1
  al 5. El sistema igual captura la respuesta (toma cualquier número del 1 al 5).

- **Variables**: `{{1}}` = nombre, `{{2}}` = referencia (modelo comprado o service).
- **Ejemplo de cuerpo**:
  > Hola {{1}} 👋 Del 1 al 5, ¿cómo calificás tu experiencia con {{2}}?
  > (1 = muy mala, 5 = excelente)

> 📝 El texto que pongas acá debe coincidir con el del diccionario `PREGUNTAS`
> en `app/services/encuestas.py` (eso es solo para la vista previa interna).

---

## Paso 5 · Pegar los códigos y los números en `marcas.py`

Abrí `whatsapp/app/marcas.py`. Vas a reemplazar dos cosas: los **números** de
WhatsApp (las claves del registro) y los **códigos de plantilla** (`HX...`).

### 5.1 · Los números

Las claves del diccionario `_REGISTRO` (ej. `"+5493510000001"`) son **ficticias**.
Reemplazalas por los números reales de cada concesionaria, en formato
internacional (`+549` + característica + número, sin 0 ni 15).

### 5.2 · Los códigos de plantilla

Cambiá cada `Plantilla("HX..._...")` por el `HX...` real que copiaste en el Paso 4.
Esta es la correspondencia actual:

| Dónde (marca · línea) | Plantilla (nombre lógico) | Placeholder a reemplazar |
|---|---|---|
| Pedro Corradi · Planes | `adjudicacion_plan` | `HX11_planes_aaaa` |
| Pedro Corradi · Planes | `cupon_pago` | `HX11_planes_cccc` |
| Pedro Corradi · Ventas | `difusion_stock` | `HX11_v_difu` |
| Pedro Corradi · Posventa | `encuesta_calidad` | `HX11_pv_bbbb` |
| Sapac · Planes | `adjudicacion_plan` | `HX22_planes_aaaa` |
| Sapac · Ventas | `difusion_stock` | `HX22_v_difu` |
| Sapac · Posventa | `encuesta_calidad` | `HX22_pv_bbbb` |

> Cada plantilla se crea **una vez por marca** (Volkswagen y Toyota tienen textos
> e imágenes distintos), por eso hay un `HX...` por celda.

---

## Paso 6 · Encender los envíos reales

Cuando las plantillas estén **aprobadas** y los números cargados:

1. En el `.env`, pasá el scheduler a envío real:
   ```
   ENCUESTAS_DRY_RUN=false
   ```
2. Para las campañas (adjudicaciones, difusión), agregá `?dry_run=false` al
   lanzarlas:
   ```
   POST /campanias/adjudicaciones/empresa_pedro_corradi?dry_run=false
   ```
3. Cuando tengas la URL pública definitiva, activá la validación de firma para
   rechazar webhooks falsos:
   ```
   TWILIO_VALIDAR_FIRMA=true
   ```
   > (Avisame cuando llegues acá: la validación de firma se afina junto con la URL
   > pública final.)

---

## Checklist final

- [ ] Cuenta de Twilio creada y WhatsApp activado (Sandbox o Sender real).
- [ ] `TWILIO_ACCOUNT_SID` y `TWILIO_AUTH_TOKEN` en el `.env`.
- [ ] Webhook **"When a message comes in"** → `https://.../webhook` (POST).
- [ ] Plantillas creadas y **aprobadas** (adjudicaciones, difusión, encuesta).
- [ ] Códigos `HX...` reales pegados en `marcas.py`.
- [ ] Números reales de cada concesionaria en `marcas.py`.
- [ ] `ENCUESTAS_DRY_RUN=false` y `dry_run=false` cuando quieras enviar de verdad.
- [ ] `TWILIO_VALIDAR_FIRMA=true` con la URL pública definitiva.

> Recordá la **regla de las 24 hs** de WhatsApp: para iniciar una conversación
> (campañas, encuestas) se usa **plantilla aprobada**; para responder dentro de
> las 24 hs de que el cliente escribió, se puede mandar texto/imagen libre.
