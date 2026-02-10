/**
 * Service Worker for Lunar Colony Tycoon
 *
 * Provides offline mode with:
 * - Cache-first strategy for static assets
 * - Network-first with fallback for API calls
 * - Pre-cached shell for offline viewing
 * - Background sync for queued actions
 */

const CACHE_NAME = "lunar-colony-v1";
const STATIC_CACHE = "lunar-static-v1";
const IMAGE_CACHE = "lunar-images-v1";
const API_CACHE = "lunar-api-v1";

// Static assets to pre-cache for offline shell
const PRECACHE_URLS = ["/", "/dashboard", "/offline"];

// Max items in dynamic caches
const MAX_IMAGE_CACHE = 50;
const MAX_API_CACHE = 30;

// ---------------------------------------------------------------------------
// Install — pre-cache shell
// ---------------------------------------------------------------------------

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// ---------------------------------------------------------------------------
// Activate — clean old caches
// ---------------------------------------------------------------------------

self.addEventListener("activate", (event) => {
  const allowedCaches = [CACHE_NAME, STATIC_CACHE, IMAGE_CACHE, API_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !allowedCaches.includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ---------------------------------------------------------------------------
// Fetch strategies
// ---------------------------------------------------------------------------

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Strategy: Cache-first for static assets
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Strategy: Cache-first for frame images (they're expensive to generate)
  if (url.pathname.startsWith("/api/frames/image")) {
    event.respondWith(cacheFirstWithExpiry(request, IMAGE_CACHE, 120_000));
    return;
  }

  // Strategy: Network-first for API calls
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstWithFallback(request, API_CACHE));
    return;
  }

  // Strategy: Network-first for pages
  event.respondWith(networkFirstWithFallback(request, STATIC_CACHE));
});

// ---------------------------------------------------------------------------
// Cache strategies
// ---------------------------------------------------------------------------

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return offlineFallback(request);
  }
}

async function cacheFirstWithExpiry(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    const dateHeader = cached.headers.get("date");
    if (dateHeader) {
      const age = Date.now() - new Date(dateHeader).getTime();
      if (age < maxAge) return cached;
    } else {
      return cached;
    }
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      // Limit cache size
      await trimCache(cacheName, MAX_IMAGE_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return stale cache if network fails
    if (cached) return cached;
    return offlineFallback(request);
  }
}

async function networkFirstWithFallback(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await trimCache(cacheName, MAX_API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return offlineFallback(request);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/frames/") ||
    url.pathname.startsWith("/modules/") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico")
  );
}

async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    // Delete oldest entries
    const toDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

function offlineFallback(request) {
  const url = new URL(request.url);
  // For navigation requests, return a basic offline page
  if (request.mode === "navigate") {
    return (
      caches.match("/offline") ||
      new Response(
        `<!DOCTYPE html>
      <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Lunar Colony - Offline</title>
      <style>
        body { background: #020617; color: #c7d2fe; font-family: system-ui; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; }
        .container { padding: 2rem; }
        h1 { font-size: 3rem; margin-bottom: 0.5rem; }
        p { color: #818cf8; font-size: 1.1rem; }
        button { margin-top: 1.5rem; padding: 0.75rem 2rem; background: #4f46e5; color: white; border: none; border-radius: 9999px; font-size: 1rem; cursor: pointer; min-width: 60px; min-height: 60px; }
      </style></head><body>
      <div class="container">
        <h1>🌙</h1>
        <h2>Colony Offline</h2>
        <p>Your lunar connection was interrupted.<br>Check your signal and try again.</p>
        <button onclick="location.reload()">🔄 Retry</button>
      </div></body></html>`,
        { headers: { "Content-Type": "text/html" } },
      )
    );
  }

  // For API requests, return a JSON error
  if (url.pathname.startsWith("/api/")) {
    return new Response(
      JSON.stringify({ error: "offline", message: "No connection available" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response("Offline", { status: 503 });
}

// ---------------------------------------------------------------------------
// Background sync for queued actions
// ---------------------------------------------------------------------------

self.addEventListener("sync", (event) => {
  if (event.tag === "lunar-sync-actions") {
    event.waitUntil(syncQueuedActions());
  }
});

async function syncQueuedActions() {
  // Retrieve queued actions from IndexedDB and replay them
  // This is a no-op placeholder — actual implementation depends
  // on what actions need offline support (collect earnings, etc.)
  try {
    const db = await openActionQueue();
    const actions = await getAllActions(db);

    for (const action of actions) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body,
        });
        if (response.ok) {
          await deleteAction(db, action.id);
        }
      } catch {
        // Will retry on next sync
        break;
      }
    }
  } catch {
    // IndexedDB not available
  }
}

// Simple IndexedDB wrapper for action queue
function openActionQueue() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("lunar-actions", 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("actions", {
        keyPath: "id",
        autoIncrement: true,
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllActions(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("actions", "readonly");
    const store = tx.objectStore("actions");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deleteAction(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("actions", "readwrite");
    const store = tx.objectStore("actions");
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
