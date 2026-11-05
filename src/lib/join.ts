export function joinUrl(origin: string, code: string) {
  return `${origin.replace(/\/$/, '')}/join/${code}`
}

/** Extracts a join code from a scanned URL (".../join/ABC123") or a bare code. */
export const codeFromScan = (raw: string): string | null => {
  const match = /\/join\/([A-Za-z0-9]{4,12})/.exec(raw) ?? /^([A-Za-z0-9]{6})$/.exec(raw.trim())
  return match?.[1]?.toUpperCase() ?? null
}

/** Search params that open an event: a private event's carry its join code, so the link works for anyone. */
export const openSearch = (event: { readonly isPrivate: boolean; readonly joinCode: string }) =>
  event.isPrivate ? { code: event.joinCode } : {}

/** The event page as a full URL, opening a private event too. */
export function eventUrl(
  origin: string,
  event: { readonly id: string; readonly isPrivate: boolean; readonly joinCode: string },
) {
  const url = new URL(`/events/${event.id}`, origin)
  for (const [key, value] of Object.entries(openSearch(event))) url.searchParams.set(key, value)
  return url.toString()
}
