import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createContext, Script } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

interface RequestLike {
  method: string
  url: string
  mode: string
  headers: Headers
}

interface WorkerEvent {
  request?: RequestLike
  respondWith?: (response: Promise<unknown> | unknown) => void
  waitUntil?: (work: Promise<unknown>) => void
}

type WorkerHandler = (event: WorkerEvent) => void

function makeRequest(overrides: Partial<RequestLike> = {}): RequestLike {
  return {
    method: 'GET',
    url: 'https://app.test/',
    mode: 'cors',
    headers: new Headers(),
    ...overrides,
  }
}

function loadServiceWorker() {
  const handlers = new Map<string, WorkerHandler>()
  const cache = {
    addAll: vi.fn().mockResolvedValue(undefined),
    match: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
  }
  const cacheStorage = {
    open: vi.fn().mockResolvedValue(cache),
    keys: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(true),
    match: vi.fn().mockResolvedValue(undefined),
  }
  const fetchMock = vi.fn()
  const clients = { claim: vi.fn().mockResolvedValue(undefined) }
  const workerGlobal = {
    location: { origin: 'https://app.test' },
    clients,
    addEventListener: (type: string, handler: WorkerHandler) => {
      handlers.set(type, handler)
    },
  }

  const source = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8')
  const context = createContext({
    self: workerGlobal,
    caches: cacheStorage,
    fetch: fetchMock,
    URL,
    Response,
    Promise,
    Set,
  })
  new Script(source, { filename: 'public/sw.js' }).runInContext(context)

  return { handlers, cache, cacheStorage, fetchMock, clients }
}

function dispatchFetch(
  handler: WorkerHandler,
  request: RequestLike,
): { response: () => Promise<unknown> | undefined; respondWith: ReturnType<typeof vi.fn> } {
  let responsePromise: Promise<unknown> | undefined
  const respondWith = vi.fn((response: Promise<unknown> | unknown) => {
    responsePromise = Promise.resolve(response)
  })

  handler({ request, respondWith })
  return { response: () => responsePromise, respondWith }
}

describe('service worker cache policy', () => {
  it('never intercepts mutations, API/data, cross-origin, signed, or authorized requests', () => {
    const { handlers } = loadServiceWorker()
    const fetchHandler = handlers.get('fetch')
    expect(fetchHandler).toBeDefined()

    const blockedRequests = [
      makeRequest({ method: 'POST', url: 'https://app.test/api/v1/installations' }),
      makeRequest({ url: 'https://app.test/api/v1/work-orders' }),
      makeRequest({ url: 'https://storage.example.test/evidence/photo.jpg' }),
      makeRequest({ url: 'https://app.test/icons/icon-192.png?X-Amz-Signature=secret' }),
      makeRequest({
        url: 'https://app.test/_next/static/chunks/app-deadbeef.js',
        headers: new Headers({ authorization: 'Bearer secret' }),
      }),
      makeRequest({ url: 'https://app.test/dashboard' }),
    ]

    for (const request of blockedRequests) {
      const { respondWith } = dispatchFetch(fetchHandler!, request)
      expect(respondWith).not.toHaveBeenCalled()
    }
  })

  it('uses network-only navigation and falls back without caching HTML', async () => {
    const { handlers, cache, cacheStorage, fetchMock } = loadServiceWorker()
    const fetchHandler = handlers.get('fetch')!
    const offlineFallback = { kind: 'offline-fallback' }
    cacheStorage.match.mockResolvedValue(offlineFallback)
    fetchMock.mockRejectedValue(new TypeError('offline'))

    const { response, respondWith } = dispatchFetch(
      fetchHandler,
      makeRequest({ url: 'https://app.test/workorders/wo-1', mode: 'navigate' }),
    )

    expect(respondWith).toHaveBeenCalledOnce()
    await expect(response()).resolves.toBe(offlineFallback)
    expect(cache.put).not.toHaveBeenCalled()
    expect(cacheStorage.match).toHaveBeenCalledWith('/offline.html')
  })

  it('cache-firsts only public shell and Next immutable static assets', async () => {
    const { handlers, cache, fetchMock } = loadServiceWorker()
    const fetchHandler = handlers.get('fetch')!
    const clone = { kind: 'asset-clone' }
    const networkResponse = {
      ok: true,
      type: 'basic',
      clone: vi.fn(() => clone),
    }
    fetchMock.mockResolvedValue(networkResponse)
    const request = makeRequest({
      url: 'https://app.test/_next/static/chunks/app-deadbeef.js',
    })

    const { response, respondWith } = dispatchFetch(fetchHandler, request)
    expect(respondWith).toHaveBeenCalledOnce()
    await expect(response()).resolves.toBe(networkResponse)
    expect(cache.put).toHaveBeenCalledWith(request, clone)
  })

  it('preloads the bounded shell and removes only obsolete SCC cache versions', async () => {
    const { handlers, cache, cacheStorage, clients } = loadServiceWorker()
    cacheStorage.keys.mockResolvedValue([
      'scc-shell-2026-07-09-1',
      'scc-shell-2026-07-10-1',
      'another-app-cache',
    ])

    let installWork: Promise<unknown> | undefined
    handlers.get('install')!({ waitUntil: (work) => { installWork = work } })
    await installWork
    expect(cache.addAll).toHaveBeenCalledWith([
      '/offline.html',
      '/manifest.json',
      '/icons/icon-192.png',
      '/icons/icon-512.png',
      '/icons/apple-touch-icon.png',
    ])

    let activateWork: Promise<unknown> | undefined
    handlers.get('activate')!({ waitUntil: (work) => { activateWork = work } })
    await activateWork
    expect(cacheStorage.delete).toHaveBeenCalledWith('scc-shell-2026-07-09-1')
    expect(cacheStorage.delete).not.toHaveBeenCalledWith('another-app-cache')
    expect(clients.claim).toHaveBeenCalledOnce()
  })
})
