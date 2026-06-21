import { ErrorBoundary } from 'react-error-boundary'
import { RouterProvider } from 'react-router-dom'

import { ErrorFallback } from '@/components/common/ErrorFallback'
import { captureReactError } from '@/lib/sentry'
import { AppProviders } from '@/providers/AppProviders'
import { router } from '@/router'

export default function App() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => {
        captureReactError(error, info.componentStack)
      }}
    >
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </ErrorBoundary>
  )
}
