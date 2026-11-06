import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { BracketScreen } from '#/components/events/bracket-screen.tsx'
import { QrCode } from '#/components/events/join-qr.tsx'
import { StorePairings } from '#/components/events/store-pairings.tsx'
import { joinUrl } from '#/lib/join.ts'
import { MatchClock } from '#/components/events/match-clock.tsx'
import { Logo } from '#/components/layout/logo.tsx'
import { LiveDot } from '#/components/ui/badge.tsx'
import { statusLabel } from '#/lib/format.ts'
import { eventQuery } from '#/lib/queries.ts'
import { absoluteUrl } from '#/lib/seo.ts'

export const Route = createFileRoute('/events/$eventId/screen')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(eventQuery(params.eventId)),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.event.name} — store screen` : 'Store screen' }],
  }),
  component: StoreScreen,
})

/**
 * Full-screen view for the store TV or a laptop on the counter:
 * the join QR, the round clock and an alphabetical pairing list
 * so players find their table without crowding the host. During a bracket it
 * shows the tables in play large, with the bracket beside them.
 */
function StoreScreen() {
  const { eventId } = Route.useParams()
  const { data, dataUpdatedAt } = useSuspenseQuery(eventQuery(eventId))
  const { event, rounds, matches } = data
  const round = rounds.find((r) => r.number === event.currentRound) ?? null
  const origin = typeof window === 'undefined' ? absoluteUrl('/') : window.location.origin

  const clock =
    round && round.status === 'active' ? (
      <MatchClock
        endsAt={round.endsAt}
        pausedRemainingMs={round.pausedRemainingMs}
        roundMinutes={round.minutes}
        offsetMs={data.serverNow - dataUpdatedAt}
        referenceNow={data.serverNow}
        size="lg"
      />
    ) : null

  // A bracket round (single elimination from round 1, or the top cut) gets the bracket screen.
  if (round?.elimination) {
    return (
      <BracketScreen
        detail={data}
        clock={clock}
        qr={
          <QrCode
            value={new URL(`/events/${eventId}`, origin).toString()}
            label="Scan to follow the bracket"
            className="size-full"
          />
        }
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-10 overflow-hidden bg-ink p-10">
      <aside className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <Logo className="text-2xl" />
          <span className="inline-flex items-center gap-2 text-lg font-semibold text-orange">
            {event.status === 'running' ? <LiveDot /> : null}
            {statusLabel(event)}
          </span>
        </div>
        <h1 className="font-display text-5xl">{event.name}</h1>
        {clock}
        <div className="mt-auto flex items-end gap-6">
          <QrCode value={joinUrl(origin, event.joinCode)} label="Scan to join" className="size-56 shrink-0" />
          <div className="flex flex-col gap-2">
            <p className="font-display text-3xl">Scan to join</p>
            <p className="text-paper-dim">or enter code</p>
            <p className="font-numerals text-7xl tracking-[0.1em] text-orange">{event.joinCode}</p>
          </div>
        </div>
      </aside>

      <section aria-label="Pairings" className="flex min-h-0 flex-col">
        <h2 className="mb-4 font-display text-3xl">
          {event.currentRound > 0 ? `Round ${event.currentRound} pairings` : `${event.playerCount} players registered`}
        </h2>
        <StorePairings matches={matches.filter((m) => m.roundNumber === event.currentRound)} />
      </section>
    </div>
  )
}
