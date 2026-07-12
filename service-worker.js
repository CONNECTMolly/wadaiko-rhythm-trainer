const CACHE="wadaiko-matsuri-v13";
const ASSETS=[
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./app-1.js",
  "./app-2.js",
  "./app-3.js",
  "./app-4.js",
  "./app-5.js",
  "./app-6.js",
  "./app-7.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./まつり2026-07-11.json"
];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  event.respondWith(
    caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      return response;
    }).catch(()=>caches.match("./index.html")))
  );
});
