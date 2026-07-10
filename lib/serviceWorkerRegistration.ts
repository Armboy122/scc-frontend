export const SERVICE_WORKER_PATH = '/sw.js'

type ServiceWorkerRegistrationLike = {
  update: () => Promise<unknown>
}

type ServiceWorkerContainerLike = {
  register: (
    scriptURL: string,
    options: RegistrationOptions,
  ) => Promise<ServiceWorkerRegistrationLike>
}

type LoadTarget = {
  document: Pick<Document, 'readyState'>
  addEventListener: Window['addEventListener']
  removeEventListener: Window['removeEventListener']
}

interface RegistrationSetupOptions {
  enabled: boolean
  container: ServiceWorkerContainerLike | undefined
  target: LoadTarget
  onError?: (error: unknown) => void
}

async function registerAndCheckForUpdate(
  container: ServiceWorkerContainerLike,
): Promise<void> {
  const registration = await container.register(SERVICE_WORKER_PATH, {
    scope: '/',
    updateViaCache: 'none',
  })

  // Ask the browser to revalidate sw.js, but never force-reload an active task.
  await registration.update()
}

export function setupServiceWorkerRegistration({
  enabled,
  container,
  target,
  onError = () => undefined,
}: RegistrationSetupOptions): () => void {
  if (!enabled || !container) return () => undefined

  let disposed = false
  const register = () => {
    if (disposed) return
    void registerAndCheckForUpdate(container).catch(onError)
  }

  if (target.document.readyState === 'complete') {
    register()
  } else {
    target.addEventListener('load', register, { once: true })
  }

  return () => {
    disposed = true
    target.removeEventListener('load', register)
  }
}
