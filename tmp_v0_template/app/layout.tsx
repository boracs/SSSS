import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'San Sebastian Surf School - S4 | Domina el Cantábrico',
  description: 'Escuela de surf premium en San Sebastián. Clases de surf, alquiler de tablas, surfskate y experiencia local en La Concha y Zurriola.',
  keywords: ['surf', 'san sebastian', 'clases surf', 'alquiler tablas', 'surfskate', 'cantabrico'],
  authors: [{ name: 'S4 Surf School' }],
  openGraph: {
    title: 'San Sebastian Surf School - S4',
    description: 'Domina el Cantábrico con la mejor escuela de surf de San Sebastián',
    type: 'website',
    locale: 'es_ES',
  },
}

export const viewport: Viewport = {
  themeColor: '#1a2744',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans antialiased min-h-screen">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
