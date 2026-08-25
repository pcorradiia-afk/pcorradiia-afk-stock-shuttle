/**
 * Arma "mi-agenda.html": la misma agenda, pero en UN solo archivo.
 * Sirve para mandarla por mail/WhatsApp, abrirla con doble clic o publicarla
 * como página suelta. El código sigue viviendo en css/ y js/: esto solo lo pega.
 *
 *   node agenda/construir-una-sola-pagina.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = dirname(fileURLToPath(import.meta.url));
const leer = (ruta) => readFileSync(join(raiz, ruta), "utf8");

const JS = ["js/fechas.js", "js/almacen.js", "js/avisos.js", "js/ics.js", "js/app.js"];

let html = leer("index.html");

// El ícono va incrustado para que no dependa de ningún archivo suelto.
const icono = `data:image/svg+xml;base64,${Buffer.from(leer("icono.svg")).toString("base64")}`;
html = html.replace(/href="icono\.svg"/g, `href="${icono}"`);

// En un solo archivo no hay dónde guardar el manifest ni el service worker.
html = html
  .replace(/\s*<link rel="manifest"[^>]*>/, "")
  .replace(/\s*<link rel="stylesheet" href="css\/estilos\.css" \/>/,
    `\n  <style>\n${leer("css/estilos.css").trimEnd()}\n  </style>`);

for (const [i, ruta] of JS.entries()) {
  const etiqueta = `  <script src="${ruta}"></script>`;
  const contenido = i === 0
    ? `  <script>\n${JS.map(leer).join("\n").trimEnd()}\n  </script>`
    : "";
  html = html.replace(new RegExp(`\\n?${etiqueta.replace(/[/.]/g, "\\$&")}`), contenido ? `\n${contenido}` : "");
}

writeFileSync(join(raiz, "mi-agenda.html"), html);
console.log(`mi-agenda.html listo (${(html.length / 1024).toFixed(0)} KB)`);
