import { describe, expect, it, vi } from 'vitest'
import {
  SERVICE_WORKER_PATH,
  setupServiceWorkerRegistration,
} from './serviceWorkerRegistration'

function createLoadTarget(readyState: DocumentReadyState) {
  const events = new EventTarget()
  return {
    events,
    target: {
      document: { readyState },
      addEventListener: events.addEventListener.bind(events) as Window['addEventListener'],
      removeEventListener: events.removeEventListener.bind(events) as Window['removeEventListener'],
    },
  }
}

describe('service worker registration', () => {
  it('waits for the page load, bypasses the HTTP cache, and checks for an update', async () => {
    const { events, target } = createLoadTarget('loading')
    const update = vi.fn().mockResolvedValue(undefined)
    const register = vi.fn().mockResolvedValue({ update })

    const cleanup = setupServiceWorkerRegistration({
      enabled: true,
      container: { register },
      target,
    })

    expect(register).not.toHaveBeenCalled()
    events.dispatchEvent(new Event('load'))

    await vi.waitFor(() => expect(update).toHaveBeenCalledOnce())
    expect(register).toHaveBeenCalledWith(SERVICE_WORKER_PATH, {
      scope: '/',
      updateViaCache: 'none',
    })

    cleanup()
  })

  it('does nothing when disabled or when the browser has no worker support', () => {
    const { events, target } = createLoadTarget('loading')
    const register = vi.fn()

    setupServiceWorkerRegistration({ enabled: false, container: { register }, target })
    setupServiceWorkerRegistration({ enabled: true, container: undefined, target })
    events.dispatchEvent(new Event('load'))

    expect(register).not.toHaveBeenCalled()
  })

  it('cancels a pending load registration during cleanup', () => {
    const { events, target } = createLoadTarget('loading')
    const register = vi.fn()

    const cleanup = setupServiceWorkerRegistration({
      enabled: true,
      container: { register },
      target,
    })
    cleanup()
    events.dispatchEvent(new Event('load'))

    expect(register).not.toHaveBeenCalled()
  })

  it('reports registration failures without throwing into the React tree', async () => {
    const { target } = createLoadTarget('complete')
    const failure = new Error('registration failed')
    const onError = vi.fn()

    setupServiceWorkerRegistration({
      enabled: true,
      container: { register: vi.fn().mockRejectedValue(failure) },
      target,
      onError,
    })

    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(failure))
  })
})
