import { pacerDevtoolsPlugin } from '@tanstack/react-pacer-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

/** Router, Query and Pacer panels in one TanStack Devtools shell (dev only). */
export function Devtools() {
  if (!import.meta.env.DEV) return null
  return (
    <TanStackDevtools
      config={{ position: 'bottom-left', hideUntilHover: true }}
      plugins={[
        { name: 'TanStack Router', render: <TanStackRouterDevtoolsPanel /> },
        { name: 'TanStack Query', render: <ReactQueryDevtoolsPanel /> },
        pacerDevtoolsPlugin(),
      ]}
    />
  )
}
