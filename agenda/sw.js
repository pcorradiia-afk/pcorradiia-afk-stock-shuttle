/* Agenda — service worker: guarda la app para que abra sin internet. */
const CACHE = "agenda-v1";
const ARCHIVOS = [
  "./",
  "index.html",
  "css/estilos.css",
  "js/fechas.js",
  "js/almacen.js",
  "js/avisos.js",
  "js/ics.js",
  "js/app.js",
  "icono.svg",
  "manifest.webmanifest",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/**
 * Primero la red (así se ve la última versión al publicar cambios) y,
 * si no hay conexión, lo guardado.
 */
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        const copia = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia)).catch(() => {});
        return resp;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html"))),
  );
});
