import { lazy, Suspense } from 'react'

/**
 * Router, Query and Pacer panels in one TanStack Devtools shell.
 * Loaded lazily in development only, so none of it ships to players' phones.
 */
const DevtoolsPanel = import.meta.env.DEV
  ? lazy(async () => {
      const [
        { TanStackDevtools },
        { ReactQueryDevtoolsPanel },
        { TanStackRouterDevtoolsPanel },
        { pacerDevtoolsPlugin },
      ] = await Promise.all([
        import('@tanstack/react-devtools'),
        import('@tanstack/react-query-devtools'),
        import('@tanstack/react-router-devtools'),
        import('@tanstack/react-pacer-devtools'),
      ])
      return {
        default: () => (
          <TanStackDevtools
            config={{ position: 'bottom-left', hideUntilHover: true }}
            plugins={[
              { name: 'TanStack Router', render: <TanStackRouterDevtoolsPanel /> },
              { name: 'TanStack Query', render: <ReactQueryDevtoolsPanel /> },
              pacerDevtoolsPlugin(),
            ]}
          />
        ),
      }
    })
  : null

export function Devtools() {
  if (!DevtoolsPanel) return null
  return (
    <Suspense fallback={null}>
      <DevtoolsPanel />
    </Suspense>
  )
}
