import { type ReactNode } from 'react'
import { Toaster } from 'sonner'

import { QueryProvider } from './QueryProvider'
import { ThemeProvider } from './ThemeProvider'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        {children}
        <Toaster richColors closeButton duration={3000} position="top-right" />
      </QueryProvider>
    </ThemeProvider>
  )
}
