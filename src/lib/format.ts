import type { EventFormat, EventStatus } from '#/server/db/schema.ts'

const FORMAT_LABELS: Record<EventFormat, string> = {
  standard: 'Standard',
  expanded: 'Expanded',
  glc: 'Gym Leader Challenge',
  unlimited: 'Unlimited',
}

export const formatLabel = (format: EventFormat): string => FORMAT_LABELS[format]

export const statusLabel = (status: EventStatus, currentRound: number): string => {
  if (status === 'registration') return 'Registration open'
  if (status === 'finished') return 'Final standings'
  return `Round ${currentRound} live`
}

export const formatEventDate = (ms: number, locale?: string): string =>
  new Date(ms).toLocaleString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
