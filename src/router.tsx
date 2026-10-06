import { QueryClient } from '@tanstack/react-query'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { ErrorState } from '#/components/layout/error-state.tsx'
import { NotFoundState } from '#/components/layout/not-found-state.tsx'
import { PageSpinner } from '#/components/layout/page-spinner.tsx'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: 1, refetchOnWindowFocus: true },
    },
  })

  const router = createTanStackRouter({
    routeTree,
    context: { queryClient, user: null },
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultViewTransition: true,
    defaultPendingMs: 250,
    defaultPendingComponent: PageSpinner,
    defaultErrorComponent: ErrorState,
    defaultNotFoundComponent: NotFoundState,
  })

  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
