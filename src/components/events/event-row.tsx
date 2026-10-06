import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Store, Users } from 'lucide-react'
import { Badge, LiveDot } from '#/components/ui/badge.tsx'
import { LocalTime } from '#/components/ui/local-time.tsx'
import { formatLabel, statusLabel } from '#/lib/format.ts'
import type { EventSummary } from '#/server/events/views.ts'

/** One event in a list: date block, name, store, status — a row, not a tile. */
export function EventRow({ event }: { event: EventSummary }) {
  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: event.id }}
      className="group grid grid-cols-[4.5rem_1fr_auto] items-center gap-4 rounded-xl border border-transparent px-3 py-4 transition-[background-color,border-color] duration-200 hover:border-line hover:bg-surface sm:gap-6 sm:px-4"
    >
      <div className="flex flex-col items-center rounded-lg border border-line bg-ink py-2 text-center">
        <span className="text-[11px] font-bold text-orange uppercase">
          <LocalTime value={event.startsAt} options={{ month: 'short' }} />
        </span>
        <LocalTime
          value={event.startsAt}
          options={{ day: 'numeric' }}
          className="font-numerals text-3xl leading-none"
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <h3 className="truncate font-display text-lg sm:text-xl">{event.name}</h3>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-paper-dim">
          <span className="inline-flex items-center gap-1.5">
            <Store className="size-3.5" />
            {event.storeName}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" />
            <span className="tabular">{event.playerCount}</span> players
          </span>
          <LocalTime value={event.startsAt} className="hidden sm:inline" />
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={event.status === 'running' ? 'live' : event.status === 'finished' ? 'muted' : 'outline'}>
          {event.status === 'running' ? <LiveDot /> : null}
          <span className="hidden sm:inline">{statusLabel(event.status, event.currentRound)}</span>
          <span className="sm:hidden">
            {event.status === 'running' ? `R${event.currentRound}` : formatLabel(event.format)}
          </span>
        </Badge>
        <ArrowUpRight className="hidden size-5 text-paper-dim transition-[translate,color] duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-orange sm:block" />
      </div>
    </Link>
  )
}
