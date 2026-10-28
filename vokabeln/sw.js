const CACHE = "vokabel-trainer-v4";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./favicon.png",
  "./vocab.json",
  "./wake.mp4"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Seite und Vokabelliste: zuerst Netz (max. 3 s), sonst Cache → Updates kommen ohne Tricks an.
// Übrige Dateien (Icons, Video): zuerst Cache.
function fromNetwork(req){
  return new Promise((resolve,reject)=>{
    const t=setTimeout(()=>reject(new Error("timeout")),3000);
    fetch(req,{cache:"no-cache"}).then((res)=>{clearTimeout(t);
      if(res&&res.ok){const copy=res.clone();caches.open(CACHE).then((c)=>c.put(req,copy))}
      resolve(res)}).catch((e)=>{clearTimeout(t);reject(e)});
  });
}
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const fresh = e.request.mode === "navigate" || /\/(index\.html|vocab\.json|manifest\.json)?$/.test(url.pathname);
  if (fresh) {
    e.respondWith(fromNetwork(e.request).catch(() =>
      caches.match(e.request, {ignoreSearch:true}).then((c) => c || caches.match("./index.html"))));
    return;
  }
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => cached))
  );
});
