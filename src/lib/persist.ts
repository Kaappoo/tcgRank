import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import type { QueryClient } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'

const ONE_DAY = 24 * 60 * 60 * 1000

/**
 * Persists opted-in queries (decks, profiles, the event you're playing) to
 * localStorage. Together with the service worker this keeps your pairing,
 * table number and deck list readable when the store Wi-Fi drops.
 */
export function startQueryPersistence(queryClient: QueryClient) {
  if (typeof window === 'undefined') return () => {}
  const persister = createSyncStoragePersister({ storage: window.localStorage, key: 'tcgrank-cache' })
  const [unsubscribe] = persistQueryClient({
    queryClient,
    persister,
    maxAge: ONE_DAY,
    buster: 'v1',
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => query.meta?.persist === true && query.state.status === 'success',
    },
  })
  return unsubscribe
}
