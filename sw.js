const CACHE = 'pondok-rq-v23-fix-sw-network-first';
const FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);
  /* PENTING: hanya tangani file aplikasi sendiri (GET, satu origin).
     Permintaan ke Supabase (login, ambil/simpan data) dibiarkan lewat
     apa adanya -- inilah penyebab bug "harus klik 2x" sebelumnya,
     karena request login sempat "dicegat" dan rusak oleh cache ini. */
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }
  /* Network-first (bukan stale-while-revalidate lagi): selalu ambil file
     TERBARU dari server dulu selama ada internet, cache cuma dipakai kalau
     offline. Ini supaya app.js, styles.css, dll selalu satu paket versi yang
     sama persis -- sebelumnya file-file ini bisa ter-update satu-satu secara
     terpisah di cache, jadi ada kemungkinan sesaat setelah deploy baru,
     pengguna dapat CAMPURAN file lama+baru yang tidak nyambung. */
  e.respondWith(
    fetch(e.request).then(res=>{
      if(res.ok){
        const copy = res.clone();
        caches.open(CACHE).then(c=>c.put(e.request, copy));
      }
      return res;
    }).catch(()=>caches.match(e.request))
  );
});
