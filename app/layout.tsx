import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ModalProvider } from '@/contexts/ModalContext'
import { AssinaturaProvider } from '@/contexts/AssinaturaContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { LayoutWrapper } from '@/components/LayoutWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sistema Financeiro ERP',
  description: 'Sistema completo de gestão financeira e clientes',
  icons: {
    icon: '/logos/favicon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <ModalProvider>
            <AssinaturaProvider>
              <LayoutWrapper>
                {children}
              </LayoutWrapper>
            </AssinaturaProvider>
          </ModalProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

