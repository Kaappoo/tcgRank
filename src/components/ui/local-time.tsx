import { useHydrated } from '#/hooks/use-hydrated.ts'

const DATE_TIME: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
}

/**
 * Renders a timestamp in the viewer's locale and timezone. The server and the
 * hydration pass use a fixed UTC/en-US rendering so markup always matches.
 */
export function LocalTime({
  value,
  options = DATE_TIME,
  className,
}: {
  value: number
  options?: Intl.DateTimeFormatOptions
  className?: string
}) {
  const hydrated = useHydrated()
  const date = new Date(value)
  const text = hydrated
    ? date.toLocaleString(undefined, options)
    : date.toLocaleString('en-US', { ...options, timeZone: 'UTC' })
  return (
    <time dateTime={date.toISOString()} className={className}>
      {text}
    </time>
  )
}
