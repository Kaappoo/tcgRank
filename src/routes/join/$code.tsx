import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { CalendarDays, Store, Users } from 'lucide-react'
import { useState } from 'react'
import { Page } from '#/components/layout/page.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import { Button, buttonVariants } from '#/components/ui/button.tsx'
import { Select } from '#/components/ui/select.tsx'
import { useEventActions } from '#/hooks/use-event-actions.ts'
import { useHydrated } from '#/hooks/use-hydrated.ts'
import { LocalTime } from '#/components/ui/local-time.tsx'
import { formatLabel, statusLabel } from '#/lib/format.ts'
import { eventByCodeQuery, eventQuery, myDecksQuery } from '#/lib/queries.ts'

export const Route = createFileRoute('/join/$code')({
  beforeLoad: ({ context, location }) => {
    // Scanning the QR while signed out: sign in first, then land right back here.
    if (!context.user) throw redirect({ to: '/sign-up', search: { redirect: location.href } })
  },
  loader: async ({ context, params }) => {
    const summary = await context.queryClient.ensureQueryData(eventByCodeQuery(params.code.toUpperCase()))
    const detail = await context.queryClient.ensureQueryData(eventQuery(summary.id))
    if (detail.viewer?.entry && detail.viewer.entry.droppedAtRound === null) {
      throw redirect({ to: '/events/$eventId', params: { eventId: summary.id } })
    }
    return summary
  },
  head: () => ({ meta: [{ title: 'Join event · tcgRank' }] }),
  component: ConfirmJoin,
})

function ConfirmJoin() {
  const { code } = Route.useParams()
  const navigate = useNavigate()
  const { data: event } = useSuspenseQuery(eventByCodeQuery(code.toUpperCase()))
  const { data: decks } = useQuery(myDecksQuery)
  const actions = useEventActions(event.id)
  const [deckId, setDeckId] = useState('none')
  const hydrated = useHydrated()

  return (
    <Page className="flex max-w-xl flex-col gap-8">
      <div className="relative isolate overflow-hidden rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <div aria-hidden className="slab right-[-22%] w-[40%] animate-slab" />
        <div className="relative flex flex-col gap-4 pr-[22%]">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{formatLabel(event.format)}</Badge>
            <Badge variant={event.status === 'running' ? 'live' : 'muted'}>
              {statusLabel(event.status, event.currentRound)}
            </Badge>
          </div>
          <h1 className="font-display text-4xl">{event.name}</h1>
          <ul className="flex flex-col gap-2 text-sm text-paper-dim">
            <li className="inline-flex items-center gap-2">
              <Store className="size-4" /> {event.storeName}
            </li>
            <li className="inline-flex items-center gap-2">
              <CalendarDays className="size-4" /> <LocalTime value={event.startsAt} />
            </li>
            <li className="inline-flex items-center gap-2">
              <Users className="size-4" /> <span className="tabular">{event.playerCount}</span> already in
            </li>
          </ul>
        </div>
      </div>

      {event.status === 'finished' ? (
        <div className="flex flex-col gap-3">
          <p className="text-paper-dim">This event has already finished.</p>
          <Link to="/events/$eventId" params={{ eventId: event.id }} className={buttonVariants({ size: 'lg' })}>
            See the results
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Deck you&apos;re playing
            <Select
              value={deckId}
              onValueChange={(v) => v && setDeckId(v)}
              options={[
                { value: 'none', label: 'Decide later' },
                ...(decks ?? []).map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
          </label>
          <Button
            size="xl"
            disabled={!hydrated || actions.join.isPending}
            onClick={() =>
              actions.join.mutate(deckId === 'none' ? null : deckId, {
                onSuccess: () => navigate({ to: '/events/$eventId', params: { eventId: event.id } }),
              })
            }
          >
            {actions.join.isPending ? 'Joining…' : `Join ${event.name}`}
          </Button>
          <p className="text-center text-xs text-paper-dim">
            {event.status === 'running'
              ? 'Rounds are already underway — you will be paired from the next round.'
              : 'You can switch decks until the first round starts.'}
          </p>
        </div>
      )}
    </Page>
  )
}
