/// <reference lib="webworker" />
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
  type PrecacheEntry,
  type SerwistGlobalConfig,
} from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: Array<PrecacheEntry | string> | undefined
  }
}
declare const self: ServiceWorkerGlobalScope

/**
 * Store Wi-Fi is unreliable. The app shell and assets are precached, card art
 * is cached forever, pages fall back to the last good copy, and mutations
 * (server functions, auth, uploads) always go to the network.
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/auth') || url.pathname.startsWith('/api/uploadthing'),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url, request }) => url.pathname.startsWith('/_serverFn') && request.method !== 'GET',
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url }) => url.hostname === 'assets.tcgdex.net' || url.hostname.endsWith('.ufs.sh'),
      handler: new CacheFirst({
        cacheName: 'card-images',
        plugins: [new ExpirationPlugin({ maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 60 })],
      }),
    },
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/og/'),
      handler: new StaleWhileRevalidate({ cacheName: 'og-images' }),
    },
    {
      matcher: ({ request }) => request.mode === 'navigate',
      handler: new NetworkFirst({
        cacheName: 'pages',
        networkTimeoutSeconds: 4,
        plugins: [new ExpirationPlugin({ maxEntries: 40 })],
      }),
    },
    {
      matcher: ({ request }) => ['style', 'script', 'font', 'image'].includes(request.destination),
      handler: new StaleWhileRevalidate({ cacheName: 'assets' }),
    },
  ],
})

serwist.addEventListeners()
