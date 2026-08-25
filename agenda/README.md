# Mi agenda · recordatorios de reuniones y tareas

App **independiente** y personal: no tiene login, ni empresas, ni permisos.
Se abre, se escribe lo que hay que recordar y listo.

## Cómo se usa

Escribí en la barra de arriba como se lo contarías a alguien. La agenda entiende
sola el día y la hora:

| Lo que escribís | Lo que agenda |
|---|---|
| `mañana 15:30 reunión con Juan` | 📅 Reunión, mañana a las 15:30 |
| `lunes 9 am llamar al contador` | ✅ Tarea, el lunes que viene a las 9:00 |
| `en 2 horas sacar el turno` | ✅ Tarea, hoy dentro de dos horas |
| `5/9 pagar el seguro` | ✅ Tarea, el 5 de septiembre, todo el día |
| `12 de septiembre reunión de directorio` | 📅 Reunión, ese día |

Debajo del recuadro se muestra **cómo lo entendió** antes de guardarlo, así no hay
sorpresas. Si preferís elegir todo a mano está el botón **“Con más detalle…”**
(tipo, día, hora, aviso, repetición y una nota).

Lo demás:

- **Solapas**: *Hoy* (incluye lo atrasado), *Próximos*, *Todo* y *Hechos*.
- **Círculo** a la izquierda: marcar como hecho. Si el recordatorio se repite, no se
  archiva: se agenda solo la próxima vez.
- **Menú ⋯ de cada tarjeta**: posponer 30 min / 1 hora / pasar a mañana, editar,
  pasar al calendario o eliminar (con *Deshacer*).
- **Tecla `/`**: va derecho a la barra de carga. **`Esc`**: cierra lo que esté abierto.

## Los avisos

1. **Dentro de la agenda** — el botón 🔔 pide permiso al navegador. Mientras la agenda
   esté abierta (una pestaña, o instalada en el celular) suena y aparece la
   notificación del sistema a la hora que corresponda. Los de *todo el día* avisan a las 9.
2. **Con la agenda cerrada** — usá **“📅 Pasar al calendario”** en el menú ⋯ de un
   recordatorio (o *“Pasar todo al calendario”* en el menú de arriba). Descarga un
   archivo `.ics` que el celular suma a su calendario, y de la alarma se encarga el
   teléfono, esté la agenda abierta o no. Se respeta el aviso previo y la repetición.

> No hay servidor propio mandando notificaciones: por eso el `.ics` es el camino
> recomendado para lo importante.

## Tus datos

Todo se guarda **en el dispositivo** (`localStorage` del navegador). No viaja a
ningún lado y funciona sin internet.

- **⋯ → Guardar una copia**: baja un `.json` con todo.
- **⋯ → Restaurar una copia**: vuelve a cargarlo (en este dispositivo o en otro).
  Suma lo que falta y actualiza lo repetido; no duplica.

Si borrás los datos del navegador, se borran los recordatorios: por eso conviene
guardar una copia de vez en cuando.

## Para abrirla

- **En la compu, sin instalar nada**: abrí `index.html` con doble clic.
- **Como si fuera un servidor** (recomendado, habilita instalarla y el modo sin conexión):

  ```bash
  cd agenda
  python3 -m http.server 8123     # o: npx serve .
  # después: http://localhost:8123
  ```

- **En el celular**: publicá la carpeta como sitio estático (en Vercel: *New Project* →
  este repo → **Root Directory: `agenda`** → framework *Other*, sin build) y desde el
  navegador del teléfono elegí **“Agregar a la pantalla de inicio”**. Queda como una app,
  con ícono propio y a pantalla completa.

## Cómo está hecho

HTML, CSS y JavaScript a secas: sin framework, sin `npm install`, sin build.

```
agenda/
  index.html              pantalla
  css/estilos.css         estilos (claro y oscuro, mobile primero)
  js/fechas.js            fechas + entender lo que se escribe en castellano
  js/almacen.js           guardar, editar, posponer, repetir, copia de seguridad
  js/avisos.js            notificaciones del sistema y sonido
  js/ics.js               pasar un recordatorio al calendario (.ics)
  js/app.js               la pantalla: dibujar la lista y responder a los clics
  manifest.webmanifest    para instalarla en el celular
  sw.js                   caché para que abra sin internet
  icono.svg               ícono
```
