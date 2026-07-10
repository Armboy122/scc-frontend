'use client'

import { useEffect } from 'react'
import { setupServiceWorkerRegistration } from '@/lib/serviceWorkerRegistration'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    return setupServiceWorkerRegistration({
      enabled: process.env.NODE_ENV === 'production',
      container: navigator.serviceWorker,
      target: window,
    })
  }, [])

  return null
}
