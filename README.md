# Mundial 2026 - Mi Álbum

App de celular para Dante (10, 5° grado) y Otto (7, 2° grado).
Arman su álbum digital del Mundial 2026 ganando figuritas al responder
trivia de **geografía, historia, matemática, inglés y fútbol** —
con preguntas pensadas para chicos en Argentina y contextualizadas a
los países que juegan el Mundial.

## Cómo se juega

1. Elegís jugador (Dante o Otto). Cada uno tiene su propio progreso.
2. Pateás al arco 🥅 — la pelota cae en una de 5 categorías.
3. Aparece la pregunta (4 opciones, con tiempito).
4. ✅ **1 acierto = 1 figurita**.
5. 🔥 **3 aciertos seguidos = sobre con 4 figuritas extra**.
6. En el álbum ves tu progreso por país y completás los equipos.
7. ¿Repetidas? **5 repes = 1 figurita nueva** desde tu perfil.

Las preguntas usan los países del Mundial como contexto. Ejemplos:
- *¿Cuál es la capital de España?*
- *¿Uruguay es limítrofe con Argentina?*
- *¿Cómo se dice "cena" en Estados Unidos?*
- *El Mundial 2026 tiene 48 equipos divididos en 12 grupos. ¿Cuántos por grupo?*

Las preguntas se filtran por nivel:
- **Fácil** → Otto (2° grado)
- **Medio** → Dante (5° grado)

## Tecnologías

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- LocalStorage (no necesita login ni internet)
- PWA (instalable en el celu desde el navegador)
- Capacitor (para empaquetar como app Android y subir a Google Play)

## Desarrollo local

```bash
npm install
npm run dev      # corre en http://localhost:8080
npm run build    # genera /dist listo para publicar
```

## Instalar en el celular (modo PWA, sin Play Store)

Es lo más rápido para que la usen YA:

1. Subí el build (`dist/`) a cualquier hosting estático
   (Vercel, Netlify, Cloudflare Pages, GitHub Pages, etc.).
2. Abrí el sitio desde Chrome en el celular.
3. Menú ▸ "Agregar a pantalla de inicio" / "Instalar app".
4. Listo: aparece como ícono y se abre en pantalla completa, sin barras.

Funciona offline desde la segunda vez gracias al service worker (`public/sw.js`).

## Publicar en Google Play

Para una APK/AAB descargable de Google Play, el proyecto ya tiene
Capacitor configurado (`capacitor.config.ts`).

### Requisitos en tu compu

- Node.js + npm (ya lo usás)
- **Android Studio** instalado (gratis: https://developer.android.com/studio)
- **JDK 17** (lo trae Android Studio)
- Cuenta de **Google Play Console** (USD 25, pago único)

### Pasos

```bash
# 1) Asegurate de tener todo instalado
npm install

# 2) Generá la carpeta android/ (la primera vez)
npm run android:init

# 3) Cada vez que cambies código:
npm run android:sync

# 4) Abrí Android Studio
npm run android:open
```

En Android Studio:

1. **Build ▸ Generate Signed Bundle / APK ▸ Android App Bundle (.aab)**
2. Creá un **keystore** la primera vez (¡guardalo bien, no se puede recuperar!).
3. Build variant: `release`.
4. Te genera `app-release.aab`.

En Google Play Console:

1. Creá una nueva app, completá ficha (título, descripción, ícono).
2. Subí el `.aab` a "Producción" o "Pruebas internas" (más rápido para probar).
3. Política de contenido: marca como apta para **niños** ("Programa Diseñado para la Familia").
4. Esperá la revisión (suele ser 1-7 días).

### Notas importantes

- El `appId` está como `ar.mundial2026.album`. Cambialo en
  `capacitor.config.ts` si querés tu propio paquete (tiene que ser único en Play Store).
- Para uso personal/familiar, alcanza con **publicar en "Pruebas internas"**
  con un grupo de testers (los emails de la familia). No requiere revisión pública.
- Si no querés subir a Play Store, después del paso 3 podés generar un APK
  desde Android Studio (Build ▸ Build APK) y mandar el `.apk` por WhatsApp;
  se instala directo en el celu activando "Orígenes desconocidos".

## Estructura del proyecto

```
src/
  data/
    teams.ts         # 48 selecciones con bandera, capital, idioma, dato curioso
    stickers.ts      # 6 figuritas por equipo (escudo + 4 jugadores + estrella)
    trivia.ts        # banco de preguntas por categoría y nivel
  store/
    game.ts          # localStorage + hooks (perfil activo, estado, acciones)
  components/
    BottomNav.tsx
    AppHeader.tsx
    Confetti.tsx
    album/StickerCard.tsx
    play/GoalKick.tsx        # mini-juego de tiro al arco
    play/QuestionCard.tsx    # pregunta con timer
    play/PackReveal.tsx      # apertura de sobre animada
  pages/
    Welcome.tsx       # elegir jugador
    Home.tsx          # menú principal
    Album.tsx         # listado por confederación
    TeamDetail.tsx    # figuritas de un equipo
    Play.tsx          # ronda de trivia (5 preguntas)
    Profile.tsx       # estadísticas y cambios
```

## Agregar más preguntas

Editá `src/data/trivia.ts` y agregá objetos al array `QUESTIONS`:

```ts
{
  id: "g-f-99",
  category: "geografia",       // geografia | historia | matematica | ingles | futbol
  level: "facil",              // facil (2°) | medio (5°)
  prompt: "¿Cuál es la capital de Italia?",
  options: ["Milán", "Roma", "Nápoles", "Florencia"],
  answer: 1,                   // índice de la respuesta correcta
  hint: "Coliseo, Vaticano..." // opcional, aparece si queda poco tiempo
}
```

## Para más adelante

- Pestaña de logros con medallas (completar un continente, racha de 10, etc.)
- Modo dos jugadores en simultáneo en el mismo dispositivo
- Lector de QR/código para marcar figuritas físicas que ya pegaron
- Sincronización entre celulares con un código corto
