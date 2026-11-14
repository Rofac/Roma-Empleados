/* Guarda la app en el celular para que abra sin internet.
   Al cambiar VERSION, el celular baja la versión nueva la próxima vez que abre la app con internet. */
const VERSION = 'roma-1.1.0';
const ARCHIVOS = ['./', 'index.html', 'manifest.webmanifest', 'css/app.css', 'js/datos.js', 'js/iconos.js', 'js/lic.js', 'js/app.js',
  'fonts/Poppins-Regular.woff', 'fonts/Poppins-Medium.woff', 'fonts/Poppins-Bold.woff',
  'img/favicon.png', 'img/icono-192.png', 'img/icono-512.png', 'img/apple-touch-icon.png', 'img/logo-roma.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting())); });
/* sólo se borran las versiones viejas DE ESTA APP (otras apps del mismo sitio comparten el lugar) */
const PREFIJO = VERSION.split('-')[0] + '-';
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith(PREFIJO) && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const conTiempo = (p, ms) => Promise.race([p, new Promise(ok => setTimeout(() => ok(null), ms))]);
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async c => {
    const g = await c.match(e.request, { ignoreSearch: true });
    const red = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => null);
    if (g) return g;
    const r = await conTiempo(red, 8000);
    return r || (await c.match('index.html')) || (await red) || Response.error();
  }));
});
