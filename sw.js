/**
 * ==========================================================================
 * SEKOLAHTU PWA SERVICE WORKER (Three-Tier Caching Architecture)
 * Lokasi Satuan Pendidikan: SD Negeri Terlangu 01, Kec. Brebes, Kab. Brebes
 * ==========================================================================
 * Tier 1 (Cache-First): Aset statis CDN pihak ketiga (Tailwind, Vue 3, FontAwesome,
 *         Lucide, Dexie.js, SheetJS, Driver.js, Chart.js, QRCode.js).
 * Tier 2 (Stale-While-Revalidate): App Shell internal (index.html, permohonan.html,
 *         verifikasi.html, manifest.json, shared/*, modules/*, assets/*).
 * Tier 3 (Network-First + Offline Queue Fallback): Endpoint API Google Apps Script
 *         (script.google.com) dan Supabase (supabase.co).
 * ==========================================================================
 */

const CACHE_NAME_STATIC = "sekolahtu-static-v1.0";
const CACHE_NAME_DYNAMIC = "sekolahtu-dynamic-v1.0";
const CACHE_NAME_CDN = "sekolahtu-cdn-v1.0";

const PRECACHE_INTERNAL_ASSETS = [
  "./",
  "./index.html",
  "./permohonan.html",
  "./verifikasi.html",
  "./manifest.json",
  "./assets/css/style.css",
  "./assets/js/config.js",
  "./assets/js/security.js",
  "./assets/js/auth.js",
  "./assets/js/data.js",
  "./assets/js/api.js",
  "./assets/js/app.js",
  "./shared/app-switcher.js",
  "./shared/camera-capture.js",
  "./shared/signature-extractor.js",
  "./shared/crud-safety.js",
  "./shared/db-dexie.js",
  "./shared/api-client.js",
  "./shared/tour-guide.js",
  "./shared/telemetry-engine.js",
  "./shared/sus-engine.js",
  "./shared/bug-reporter.js",
  "./shared/glossary.js",
  "./modules/core-tu/lapbul.js",
  "./modules/core-tu/ekinerja-vault.js",
  "./modules/core-tu/surat-permendagri.js",
  "./modules/core-tu/bku-keuangan.js",
  "./modules/core-tu/tindak-lanjut.js"
];

const PRECACHE_CDN_ASSETS = [
  "https://cdn.tailwindcss.com",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css",
  "https://unpkg.com/vue@3/dist/vue.global.prod.js",
  "https://unpkg.com/lucide@latest",
  "https://unpkg.com/dexie@3/dist/dexie.js",
  "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js",
  "https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.js.iife.js",
  "https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.css",
  "https://cdn.jsdelivr.net/npm/chart.js",
  "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"
];

const CDN_HOSTS = [
  "cdn.tailwindcss.com",
  "cdnjs.cloudflare.com",
  "unpkg.com",
  "cdn.sheetjs.com",
  "cdn.jsdelivr.net",
  "fonts.googleapis.com",
  "fonts.gstatic.com"
];

const API_HOSTS = [
  "script.google.com",
  "script.googleusercontent.com",
  "supabase.co"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const staticCache = await caches.open(CACHE_NAME_STATIC);
      // Precache aset internal secara toleran agar satu file gagal tidak membatalkan instalasi
      await Promise.allSettled(
        PRECACHE_INTERNAL_ASSETS.map((url) =>
          staticCache.add(url).catch((err) => console.warn("[SW] Skip precache internal:", url, err))
        )
      );

      const cdnCache = await caches.open(CACHE_NAME_CDN);
      await Promise.allSettled(
        PRECACHE_CDN_ASSETS.map((url) =>
          cdnCache.add(new Request(url, { mode: "no-cors" })).catch((err) =>
            console.warn("[SW] Skip precache CDN:", url, err)
          )
        )
      );
    })()
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const validCaches = [CACHE_NAME_STATIC, CACHE_NAME_DYNAMIC, CACHE_NAME_CDN];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (!validCaches.includes(key)) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

function isCdnRequest(url) {
  return CDN_HOSTS.some((host) => url.hostname.includes(host));
}

function isApiRequest(url) {
  return API_HOSTS.some((host) => url.hostname.includes(host));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // --------------------------------------------------------------------------
  // TIER 3: Network-First dengan Fallback Offline Queue (GAS & Supabase API)
  // --------------------------------------------------------------------------
  if (isApiRequest(url)) {
    if (req.method !== "GET") {
      event.respondWith(
        fetch(req.clone()).catch(async () => {
          // Beritahu client bahwa request gagal karena offline dan telah/perlu masuk antrean sync_queue
          const clientsList = await self.clients.matchAll({ type: "window" });
          clientsList.forEach((client) => {
            client.postMessage({
              type: "SW_OFFLINE_API_INTERCEPTED",
              url: req.url,
              timestamp: new Date().toISOString()
            });
          });
          return new Response(
            JSON.stringify({
              success: true,
              offlineQueued: true,
              code: "OFFLINE_QUEUED",
              message: "Perangkat sedang tanpa sinyal. Data telah diamankan di Basis Data Lokal dan akan dikirim otomatis saat sinyal pulih."
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json;charset=utf-8" }
            }
          );
        })
      );
      return;
    }

    // GET ke API: Network-First lalu fallback ke Dynamic Cache
    event.respondWith(
      fetch(req)
        .then((netRes) => {
          if (netRes && netRes.status === 200) {
            const clone = netRes.clone();
            caches.open(CACHE_NAME_DYNAMIC).then((cache) => cache.put(req, clone));
          }
          return netRes;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          return new Response(
            JSON.stringify({
              success: false,
              offline: true,
              message: "Sedang offline dan data belum tersedia di penyimpanan lokal."
            }),
            { status: 503, headers: { "Content-Type": "application/json" } }
          );
        })
    );
    return;
  }

  // Hanya tangani GET untuk aset statis & dokumen
  if (req.method !== "GET") return;

  // --------------------------------------------------------------------------
  // TIER 1: Cache-First untuk Aset Eksternal CDN
  // --------------------------------------------------------------------------
  if (isCdnRequest(url)) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(req)
          .then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === "opaque")) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME_CDN).then((cache) => cache.put(req, clone));
            }
            return networkResponse;
          })
          .catch(() => caches.match(req));
      })
    );
    return;
  }

  // --------------------------------------------------------------------------
  // TIER 2: Stale-While-Revalidate untuk App Shell & Pustaka Internal
  // --------------------------------------------------------------------------
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME_STATIC).then((cache) => cache.put(req, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          if (req.headers.get("accept")?.includes("text/html")) {
            return caches.match("./index.html");
          }
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

