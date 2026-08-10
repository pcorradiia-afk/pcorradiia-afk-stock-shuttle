# 🔧 Integración: Notificación "Repuestos disponibles" por WhatsApp
### Pedro Corradi (Ford) — Sistema de Posventa → Motor de WhatsApp

**Objetivo:** que el sistema de Posventa avise al cliente por WhatsApp, automáticamente,
cuando llega el repuesto que encargó. La notificación sale desde el número oficial de
Pedro Corradi (Ford), unificado con el resto de las comunicaciones.

**Arquitectura:** el sistema de Posventa (de ustedes) es el que decide *cuándo* notificar.
Cuando marcan un repuesto como "recibido / listo para retirar", su sistema hace **una
llamada HTTP a nuestra API** con los datos del cliente. Nosotros enviamos el WhatsApp.

---

## 1) Endpoint a llamar

```
POST https://fiorasi-whatsapp.onrender.com/notificaciones/repuestos
```

**Cabeceras (headers):**
```
Content-Type: application/json
X-API-Token: <TOKEN>     ← se los pasamos por canal seguro (no va en este doc)
```

## 2) Cuerpo (JSON) que tienen que enviar

```json
{
  "cliente":  "Juan Pérez",                    // requerido
  "telefono": "+5492804123456",                // requerido (formato internacional +549...)
  "repuesto": "Kit de embrague",               // requerido (qué llegó; texto libre)
  "orden":    "OR-12345",                       // opcional (nº de pedido / OR)
  "vehiculo": "Ford Ranger AB123CD",            // opcional
  "sucursal": "Trelew",                         // opcional
  "retiro":   "Mostrador de Repuestos, Lun a Vie de 8 a 17 h"  // opcional (dónde/cuándo retirar)
}
```

**Notas sobre los campos:**
- `telefono`: idealmente en formato **+549** + área + número (ej. `+5492804123456`).
  Si lo mandan en formato local lo normalizamos, pero el internacional es lo más seguro.
- Los campos `opcional` se usan para personalizar el mensaje; si no los mandan, se omiten.

## 3) Respuesta que devolvemos

```json
{ "estado": "enviada", "detalle": "SMxxxxxxxx", "destino": "+5492804123456" }
```
- `estado`: `enviada` (ok) · `simulada` (modo prueba) · `error`.
- En caso de error: `{ "estado": "error", "detalle": "motivo" }`.

## 4) Mensaje que recibe el cliente (plantilla)

> *¡Hola **Juan Pérez**! 👋 Te escribimos de **Pedro Corradi** (Ford).*
> *✅ Ya llegaron los repuestos que encargaste: **Kit de embrague**.*
> *Podés pasar a retirarlos por **Mostrador de Repuestos, Lun a Vie de 8 a 17 h**.*
> *¡Te esperamos! 🔧*

*(El texto exacto lo definimos entre todos y se aprueba como plantilla de WhatsApp.)*

---

## ✅ Para poner esto en marcha necesitamos definir / preparar

1. **Texto final del mensaje** → ¿les sirve el de arriba o quieren otro? (Se aprueba 1 sola vez en WhatsApp/Meta.)
2. **Qué campos tiene su sistema** disponibles para mandarnos (de la lista de arriba, cuáles sí).
3. **¿El cliente puede responder?** ¿Quieren que si el cliente contesta (ej. "¿a qué hora?")
   la conversación caiga en el buzón para que un asesor le responda? (Recomendado: sí.)
4. **Token de acceso** → se los entregamos por un canal seguro.
5. **Horario de envío** → ¿mandar siempre al instante, o respetar un horario comercial?

> ℹ️ Del lado nuestro: habilitamos el endpoint y damos de alta la plantilla en WhatsApp.
> Del lado de ustedes: la llamada HTTP al endpoint cuando marcan el repuesto como recibido.
