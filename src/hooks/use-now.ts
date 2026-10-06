import { useEffect, useState } from 'react'

/**
 * Current time, re-rendering on every whole second (aligned to the wall clock).
 * Returns `null` during SSR and the first client render so markup hydrates
 * identically; callers fall back to a server-provided timestamp until then.
 */
export function useNow(enabled = true): number | null {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    if (!enabled) return
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      setNow(Date.now())
      timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5)
    }
    tick()
    return () => clearTimeout(timer)
  }, [enabled])
  return now
}
