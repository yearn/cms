import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '../src/index.css'
import Providers from '../src/providers'
import AppLayout from '../src/routes/Layout'

export const metadata: Metadata = {
  title: 'ycms',
  description: 'Yearn CMS metadata editor',
  icons: {
    icon: '/yearn.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  )
}
