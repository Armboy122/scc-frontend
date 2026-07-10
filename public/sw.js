/* Smart Cover Connect offline shell.
 * This worker deliberately does not cache pages, API data, mutations, tokens,
 * presigned URLs, or cross-origin responses.
 */

const CACHE_PREFIX = 'scc-shell-'
const CACHE_VERSION = '2026-07-10-1'
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`
const OFFLINE_URL = '/offline.html'
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
]
const PRECACHE_PATHS = new Set(PRECACHE_URLS)

function isCacheableShellRequest(request, url) {
  if (request.method !== 'GET') return false
  if (url.origin !== self.location.origin) return false
  if (url.search !== '') return false
  if (request.headers.has('authorization')) return false
  if (url.pathname.startsWith('/api/')) return false

  return (
    PRECACHE_PATHS.has(url.pathname)
    || url.pathname.startsWith('/_next/static/')
  )
}

async function cacheFirstShellAsset(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok && response.type === 'basic') {
    await cache.put(request, response.clone())
  }
  return response
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  // Navigation is always network-only. On a network failure, return only the
  // public offline fallback; authenticated HTML is never written to a cache.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const fallback = await caches.match(OFFLINE_URL)
        return fallback || Response.error()
      }),
    )
    return
  }

  if (isCacheableShellRequest(request, url)) {
    event.respondWith(cacheFirstShellAsset(request))
  }
})
