/* Service worker for "مين الجاسوس؟"
   Bump VERSION only when you change the precache list. Content edits to
   index.html propagate automatically (stale-while-revalidate: the fresh copy
   is fetched in the background and used on the next launch). */
const VERSION = 'gassous-v2';
const SCOPE = self.registration.scope;                 // e.g. https://user.github.io/Gassous-app/
const url = p => new URL(p, SCOPE).href;
const INDEX = url('index.html');

const CORE = ['./', 'index.html', 'manifest.json', 'icon.svg', 'icon-192.png', 'icon-512.png'].map(url);   // must all succeed
const OPTIONAL = ['fonts/Cairo.woff2'].map(url);                             // best effort
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(CORE.map(u => new Request(u, { cache: 'reload' })));
    await Promise.allSettled(OPTIONAL.map(u => cache.add(new Request(u, { cache: 'reload' }))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin !== location.origin && !FONT_HOSTS.includes(u.hostname)) return;
  e.respondWith(respond(e, req));
});

async function respond(e, req) {
  const cache = await caches.open(VERSION);
  const isNav = req.mode === 'navigate';
  const key = isNav ? INDEX : req;                      // every page load is served the app shell

  const cached = await cache.match(key, { ignoreSearch: true });
  const refresh = fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) cache.put(key, res.clone());
    return res;
  }).catch(() => null);

  if (cached) { e.waitUntil(refresh); return cached; }  // instant + offline-safe

  const fresh = await refresh;                          // first-ever request for this asset
  if (fresh) return fresh;
  if (isNav) return (await cache.match(INDEX)) || Response.error();
  return Response.error();
}
