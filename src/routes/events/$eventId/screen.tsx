import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { joinUrl, QrCode } from '#/components/events/join-qr.tsx'
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
 * so players find their table without crowding the host.
 */
function StoreScreen() {
  const { eventId } = Route.useParams()
  const { data, dataUpdatedAt } = useSuspenseQuery(eventQuery(eventId))
  const { event, rounds, matches } = data
  const round = rounds.find((r) => r.number === event.currentRound) ?? null
  const origin = typeof window === 'undefined' ? absoluteUrl('/') : window.location.origin

  const seats = matches
    .filter((m) => m.roundNumber === event.currentRound)
    .flatMap((m) => [
      { name: m.player1.name, table: m.table, opponent: m.player2?.name ?? 'Bye', done: m.status === 'confirmed' },
      ...(m.player2
        ? [{ name: m.player2.name, table: m.table, opponent: m.player1.name, done: m.status === 'confirmed' }]
        : []),
    ])
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="fixed inset-0 z-50 grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-10 overflow-hidden bg-ink p-10">
      <aside className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <Logo className="text-2xl" />
          <span className="inline-flex items-center gap-2 text-lg font-semibold text-orange">
            {event.status === 'running' ? <LiveDot /> : null}
            {statusLabel(event.status, event.currentRound)}
          </span>
        </div>
        <h1 className="font-display text-5xl">{event.name}</h1>
        {round && round.status === 'active' ? (
          <MatchClock
            endsAt={round.endsAt}
            pausedRemainingMs={round.pausedRemainingMs}
            roundMinutes={event.roundMinutes}
            offsetMs={data.serverNow - dataUpdatedAt}
            referenceNow={data.serverNow}
            size="lg"
          />
        ) : null}
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
        <ol className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 content-start gap-x-8 gap-y-1 overflow-hidden text-xl">
          {seats.map((s) => (
            <li
              key={`${s.table}-${s.name}`}
              className={`grid grid-cols-[1fr_auto] items-baseline gap-4 border-b border-line py-2 ${s.done ? 'text-paper-dim' : ''}`}
            >
              <span className="truncate">
                <span className="font-semibold">{s.name}</span>
                <span className="text-base text-paper-dim"> vs {s.opponent}</span>
              </span>
              <span className="font-numerals text-3xl text-orange">{s.table}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
