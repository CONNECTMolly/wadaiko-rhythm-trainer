const CACHE="wadaiko-matsuri-v15";
const CORE=[
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
  "./まつり2026-07-11.json",
  "./refresh.html"
];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
  );
  self.clients.claim();
});

async function networkFirst(request){
  const cache=await caches.open(CACHE);
  try{
    const response=await fetch(request,{cache:"no-store"});
    if(response&&response.ok)await cache.put(request,response.clone());
    return response;
  }catch(error){
    return (await cache.match(request)) || (request.mode==="navigate" ? await cache.match("./index.html") : Response.error());
  }
}

async function cacheFirst(request){
  const cached=await caches.match(request);
  if(cached)return cached;
  const response=await fetch(request);
  if(response&&response.ok){
    const cache=await caches.open(CACHE);
    await cache.put(request,response.clone());
  }
  return response;
}

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const destination=event.request.destination;
  const mustBeFresh=event.request.mode==="navigate" || ["script","style","worker","manifest"].includes(destination);
  event.respondWith(mustBeFresh ? networkFirst(event.request) : cacheFirst(event.request));
});
