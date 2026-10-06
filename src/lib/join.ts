export function joinUrl(origin: string, code: string) {
  return `${origin.replace(/\/$/, '')}/join/${code}`
}

/** Extracts a join code from a scanned URL (".../join/ABC123") or a bare code. */
export const codeFromScan = (raw: string): string | null => {
  const match = /\/join\/([A-Za-z0-9]{4,12})/.exec(raw) ?? /^([A-Za-z0-9]{6})$/.exec(raw.trim())
  return match?.[1]?.toUpperCase() ?? null
}
