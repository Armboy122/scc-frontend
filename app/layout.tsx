import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { OnlineStatusBanner } from '@/components/pwa/OnlineStatusBanner'
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration'
import { PWA_ICON_METADATA, PWA_VIEWPORT } from '@/lib/pwaMetadata'
import { Providers } from './providers'
import 'leaflet/dist/leaflet.css'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Smart Cover Connect',
    template: '%s | Smart Cover Connect',
  },
  description: 'ระบบติดตามการให้เช่าฉนวนครอบสายไฟ การไฟฟ้าส่วนภูมิภาค',
  manifest: '/manifest.json',
  icons: PWA_ICON_METADATA,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SCC',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport = PWA_VIEWPORT

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th" className={inter.variable} data-scroll-behavior="smooth">
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
        <ServiceWorkerRegistration />
        <OnlineStatusBanner />
      </body>
    </html>
  )
}
