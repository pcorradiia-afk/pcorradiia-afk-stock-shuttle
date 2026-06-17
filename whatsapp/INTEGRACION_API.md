# Integración con el sistema interno (in-house) — API del motor de WhatsApp

Este documento es para **el equipo de desarrollo del sistema interno** del
concesionario (el de `192.168.10.12`). Describe cómo conectar ese sistema con el
**motor de WhatsApp** para automatizar las encuestas de calidad (y, a futuro,
cualquier aviso por WhatsApp: servicio, ventas, repuestos, entregas, Óvalo…).

## Idea general

- **El sistema interno es "el cerebro"**: tiene las OR, los clientes, las reglas,
  la clasificación (Felicitación / Registrar / RQR) y las alertas.
- **El motor de WhatsApp es "el brazo"**: manda la encuesta, conversa con el
  cliente, captura las respuestas y **las devuelve** al sistema interno.

Son **dos llamadas HTTP**:

```
  Sistema interno  ──(1) POST /eventos──────────────▶  Motor de WhatsApp
                                                            │
                                                  (manda y conversa por WhatsApp)
                                                            │
  Sistema interno  ◀──(2) POST writeback (tu URL)──────────┘
```

El sistema interno decide **a quién** y **cuándo** encuestar (p. ej. al cerrar la
OR, o a las 48 hs). El motor sólo manda cuando se lo piden.

---

## (1) Enviar una encuesta — `POST /eventos`

El sistema interno llama a este endpoint del motor (por ejemplo, con un botón
**"Enviar encuesta por WhatsApp"** en el módulo de Calidad, o automáticamente al
cerrar/entregar una OR).

**URL:** `https://<motor>/eventos`
**Auth:** cabecera `X-API-Token: <API_TOKEN>` (te lo pasamos aparte; no va al repo).
**Body (JSON):**

| Campo          | Obligatorio | Ejemplo                  | Notas |
|----------------|:----------:|--------------------------|-------|
| `telefono`     | **sí**     | `"02804320238"`          | Se normaliza solo a `+549…` |
| `tipo`         | recomendado| `"servicio"`             | `servicio` \| `taller` \| `repuestos` \| `garantia` \| `ventas` \| `entrega` |
| `id_externo`   | recomendado| `"OR-489826"`            | La OR. Vuelve en el writeback para que completes esa orden |
| `cliente`      | recomendado| `"Francisco Mendez"`     | Nombre (va en el saludo) |
| `referencia`   | recomendado| `"Ford Transit AG299EX"` | Modelo / patente / detalle |
| `sucursal`     | opcional   | `"Trelew"`               | Vuelve en el writeback |
| `empresa`      | opcional   | `"empresa_pedro_corradi"`| Por defecto: Pedro Corradi |
| `fecha_evento` | opcional   | `"2026-06-06T11:22"`     | Informativo |

**Ejemplo:**

```bash
curl -X POST https://<motor>/eventos \
  -H "X-API-Token: <API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "servicio",
    "id_externo": "OR-489826",
    "cliente": "Francisco Mendez",
    "telefono": "02804320238",
    "referencia": "Ford Transit AG299EX",
    "sucursal": "Trelew"
  }'
```

**Respuesta:**

```json
{
  "estado": "enviada",          // enviada | simulada | error
  "detalle": "SMxxxxxxxx",      // SID de Twilio, o "dry-run", o el error
  "numero_origen": "+549...",
  "telefono": "+5492804320238",
  "vista_previa": "¡Hola Francisco Mendez! 👋 ..."
}
```

> En modo prueba (sin número activo / `dry_run`) devuelve `"simulada"` y no manda
> nada real, pero igual deja la encuesta lista para probar el circuito.

---

## (2) Recibir el resultado — *writeback* a TU URL

Cuando el cliente termina de responder por WhatsApp, el motor hace un `POST` a la
URL que vos expongas (la configuramos en el motor como `WRITEBACK_URL`).

**Lo recibe TU sistema** (vos definís la ruta, p. ej. `/api/encuestas/resultado`).
**Auth:** el motor manda `Authorization: Bearer <WRITEBACK_TOKEN>` (lo elegís vos).
**Body (JSON):**

```json
{
  "id_externo": "OR-489826",
  "tipo": "taller",
  "sucursal": "Trelew",
  "telefono": "+5492804320238",
  "puntajes": {
    "atencion": 1,
    "calidad_trabajo": 3,
    "claridad": 5,
    "recomendacion": 1
  },
  "recomienda": false,
  "clasificacion": "RQR",
  "comentario": "el cliente está muy enojado, no resolvieron el problema"
}
```

| Campo           | Descripción |
|-----------------|-------------|
| `id_externo`    | La OR que mandaste en `/eventos`. Úsala para ubicar la orden. |
| `puntajes`      | Un puntaje 1-5 por pregunta. Las **claves** son las de cada pregunta (configurables desde el panel). |
| `recomienda`    | `true` / `false` / `null` (derivado de la pregunta de recomendación). |
| `clasificacion` | `"Felicitacion"` \| `"Registrar"` \| `"RQR"` (misma lógica que tu formulario). |
| `comentario`    | Texto libre que dejó el cliente (puede venir vacío). |

**Comportamiento del writeback:**

- Se dispara **apenas el cliente completa los puntajes** (así un **RQR** te llega
  aunque no deje comentario).
- Si después deja un **comentario**, se dispara **otra vez** con el mismo
  `id_externo` y el comentario cargado → tratá la operación como **upsert** por
  `id_externo`.
- Tu sistema recibe esto, **completa la OR** y, si `clasificacion == "RQR"`,
  **dispara tu alerta** (reusás la que ya tenés).

**Clasificación automática** (la calcula el motor, espejo de tu criterio):

- Algún puntaje **≤ 2**, o `recomienda == false` → **RQR**
- Algún puntaje **== 3** → **Registrar**
- Todo **≥ 4** y recomienda → **Felicitacion**

---

## Preguntas de la encuesta

Las preguntas (y su orden) se editan desde el **panel del motor**
(*Herramientas → Encuestas*), por separado para **Posventa/Taller** y **Ventas**.
La **clave** de cada pregunta es la que aparece en `puntajes` del writeback, así
que conviene acordar las claves una vez (p. ej. `atencion`, `calidad_trabajo`,
`explicacion`, `recomendacion`) para mapearlas a las columnas de tu sistema.

---

## Seguridad

- `API_TOKEN` (entrada a `/eventos`) y `WRITEBACK_TOKEN` (salida a tu URL) se
  configuran como variables de entorno del motor. **Nunca** se publican en el repo.
- Los datos de clientes (nombre, teléfono, OR) viajan por la API en el momento;
  **no se guardan** en el repositorio público.

## Despliegue sugerido (por etapas)

1. **Servicio / Calidad** (donde ya está el flujo y el dolor de los llamados).
2. **Entregas 0km**, **Repuestos**, **Ventas**.
3. **Plan Óvalo** y difusión (ya tienen su panel).
