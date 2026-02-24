'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'
import { CleanupProvider } from './cleanup-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <CleanupProvider>
          {children}
        </CleanupProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
