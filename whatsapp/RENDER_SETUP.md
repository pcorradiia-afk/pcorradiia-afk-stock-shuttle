# Poner el bot online (gratis) con Render

Guía para publicar el backend de WhatsApp en internet **sin costo**, así Twilio
puede mandarle los mensajes. No hace falta saber programar.

> Resultado: una dirección pública tipo `https://fiorasi-whatsapp.onrender.com`
> que pegaremos en Twilio.

---

## Paso 1 · Crear la cuenta en Render

1. Entrá a <https://render.com> → **Get Started** → registrate con tu cuenta de
   **GitHub** (la misma del repositorio).
2. Cuando te lo pida, autorizá a Render a ver el repositorio
   `pcorradiia-afk-stock-shuttle`.

## Paso 2 · Crear el servicio desde el repositorio

1. En Render: **New +** → **Blueprint**.
2. Elegí el repositorio `pcorradiia-afk-stock-shuttle`.
3. Render detecta solo el archivo `render.yaml` y te muestra el servicio
   **fiorasi-whatsapp** (plan **Free**). Apretá **Apply** / **Create**.

> Si en vez de Blueprint preferís hacerlo a mano: **New + → Web Service**,
> elegí el repo, y configurá: **Root Directory** = `whatsapp`,
> **Build Command** = `pip install -r requirements.txt`,
> **Start Command** = `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

## Paso 3 · Cargar las credenciales (variables de entorno)

En el servicio → **Environment** → agregá estas variables. Acá va el **Auth
Token secreto** (en Render, no en el código ni en el chat):

| Variable | Valor |
|---|---|
| `TWILIO_ACCOUNT_SID` | tu Account SID (`AC...`) |
| `TWILIO_AUTH_TOKEN` | tu Auth Token (secreto) |
| `SANDBOX_NUMERO` | el número del Sandbox de Twilio (ej. `+14155238886`) |
| `SANDBOX_EMPRESA` | `empresa_pedro_corradi` (o la que quieras probar) |
| `SANDBOX_LINEA` | `ventas` |

Guardá. Render vuelve a desplegar solo.

## Paso 4 · Copiar la URL pública

Cuando el deploy diga **Live**, arriba vas a ver la URL del servicio, algo como:

```
https://fiorasi-whatsapp.onrender.com
```

Probá que esté viva abriendo esa URL en el navegador: tiene que mostrar un texto
JSON con `"estado": "ok"`.

## Paso 5 · Conectar Twilio al bot

1. En Twilio: **Messaging → Try it out → Send a WhatsApp message → Sandbox
   settings**.
2. En **"When a message comes in"** pegá tu URL + `/webhook`:
   ```
   https://fiorasi-whatsapp.onrender.com/webhook
   ```
   Método **POST**. Guardá.
3. Desde tu celular, mandá el mensaje **`join <código>`** al número del Sandbox
   (el código te lo muestra Twilio en esa misma pantalla) para "unirte".
4. Escribile **`hola`** al número del Sandbox. 🎉 El bot te tiene que responder
   con el menú de la marca.

---

## Notas importantes

- 💤 **El plan Free duerme** tras unos minutos sin uso: el primer mensaje después
  de un rato puede tardar ~30 seg en despertar el servidor. Para pruebas está
  perfecto. Por eso dejamos el **scheduler apagado** (`SCHEDULER_ACTIVO=false`):
  los envíos automáticos necesitan un plan que no se duerma — lo activamos cuando
  pasemos a un plan pago o a otro hosting.
- 🔁 Cada vez que se actualiza el código en la rama, Render vuelve a desplegar
  solo.
- 🔐 El Auth Token vive **solo** en las variables de Render. Nunca en el código.
