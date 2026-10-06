/** Registers the Serwist service worker in production builds only. */
export function registerServiceWorker() {
  if (import.meta.env.DEV || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  const register = () => navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
}
