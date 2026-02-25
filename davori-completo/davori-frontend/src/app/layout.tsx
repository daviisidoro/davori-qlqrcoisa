// src/app/layout.tsx
import type { Metadata } from 'next'
import '@/styles/globals.css'
import { AuthProvider } from '@/lib/auth'
import { QueryProvider } from '@/lib/query'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: { default: 'Davori', template: '%s — Davori' },
  description: 'A plataforma completa para vender e entregar infoprodutos.',
  themeColor: '#e8401c',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
