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
- **Enrutamiento por número (`To`)** → empresa, marca, plantillas y horario.
- **System prompt de IA dinámico por marca** (Volkswagen/Pedro Corradi vs Toyota/Sapac).
- **Botonera de derivación humana** que pausa el bot y avisa al vendedor.
- **Ventanas de horario** con respuesta empática fuera de hora.
- **Rate limiting** de campañas (1 envío por número cada 24 hs, por empresa).
- **Normalización de teléfonos** de LatAm a formato internacional `+549...`.

## Estructura

```
whatsapp/
  app/
    main.py              · servidor FastAPI + ruta /webhook
    config.py            · configuración desde .env (tokens, keys)
    marcas.py            · REGISTRO multi-marca (número → empresa/marca/prompt)
    core/
      normalizacion.py   · números locales → +549 (E.164)
      horarios.py        · ¿la concesionaria está abierta?
      rate_limit.py      · prevención de duplicados (24 hs por empresa)
    services/
      ia.py              · Agente de IA (prompt por marca) — simulado / Claude real
      twilio_client.py   · TwiML (menú) + envío saliente
      derivacion.py      · pausa del bot + alerta al vendedor
      enrutador.py       · reglas de negocio: qué responder
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

```bash
# Mensaje libre a Pedro Corradi (Volkswagen) → activa la IA simulada
curl -X POST http://localhost:8000/webhook \
  -d "From=whatsapp:+5493515559999" \
  -d "To=whatsapp:+5493510000001" \
  -d "Body=Hola, quiero un Amarok y entrego mi usado" \
  -d "MessageSid=SM_demo_1"

# Saludo a Sapac (Toyota) → devuelve el menú con la marca
curl -X POST http://localhost:8000/webhook \
  -d "From=whatsapp:+5493515558888" \
  -d "To=whatsapp:+5493510000002" \
  -d "Body=hola" \
  -d "MessageSid=SM_demo_2"

# Pedir un asesor → pausa el bot y emite la alerta de derivación
curl -X POST http://localhost:8000/webhook \
  -d "From=whatsapp:+5493515559999" \
  -d "To=whatsapp:+5493510000001" \
  -d "Body=4" \
  -d "MessageSid=SM_demo_3"
```

Mirá la consola del servidor: vas a ver el log limpio del mensaje, la marca
identificada y, en el caso de texto libre, el **system prompt que cambia según
la marca**.

## Próximos pasos (Fase 2)

- Reemplazar el registro de `marcas.py` y el `rate_limit` en memoria por Supabase.
- Conectar los datos reales por empresa (Excel/Sheets) en `data/`.
- Activar Claude (`IA_ACTIVA=true`) para la calificación real de leads.
- Cargar las plantillas HSM aprobadas y el envío de multimedia (PDF/imágenes).
