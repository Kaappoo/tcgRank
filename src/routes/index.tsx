import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, QrCode } from 'lucide-react'
import { EventRow } from '#/components/events/event-row.tsx'
import { MatchClock } from '#/components/events/match-clock.tsx'
import { PairingCard } from '#/components/events/pairing-card.tsx'
import { buttonVariants } from '#/components/ui/button.tsx'
import { eventsQuery } from '#/lib/queries.ts'
import { cn } from '#/lib/utils.ts'
import type { MatchView } from '#/server/events/views.ts'

export const Route = createFileRoute('/')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(eventsQuery('live')),
      context.queryClient.ensureQueryData(eventsQuery('upcoming')),
    ]),
  component: Home,
})

const demoMatch: MatchView = {
  id: 'demo',
  roundNumber: 3,
  table: 7,
  player1: { id: 'you', name: 'Kaua Andrade', username: null, image: null },
  player2: { id: 'opp', name: 'Marina Costa', username: null, image: null },
  player1Games: 0,
  player2Games: 0,
  outcome: null,
  reportedById: null,
  status: 'playing',
}
const demoRecords = new Map([
  ['you', { wins: 2, losses: 0, draws: 0, byes: 0 }],
  ['opp', { wins: 1, losses: 0, draws: 1, byes: 0 }],
])
// A fixed instant keeps the server render and hydration identical.
const DEMO_PAUSED_MS = 31 * 60_000 + 42_000

function Home() {
  const { user } = Route.useRouteContext()
  const { data: live } = useSuspenseQuery(eventsQuery('live'))
  const { data: upcoming } = useSuspenseQuery(eventsQuery('upcoming'))

  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-line">
        <div aria-hidden className="slab right-[-14%] hidden opacity-90 lg:block" />
        <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-14 pb-16 sm:px-6 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:pb-24">
          <div className="flex flex-col gap-8">
            <h1 className="font-display text-[clamp(3rem,9vw,6rem)] leading-[0.88]">
              League night,
              <br />
              <span className="text-orange">sorted.</span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-paper-dim">
              Built for Pokémon TCG at your local store. Players scan the host&apos;s QR code to join, see their
              opponent and table the second pairings drop, report the score from their phone and watch the round clock
              count down.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to={user ? '/events/new' : '/sign-up'} className={buttonVariants({ size: 'xl' })}>
                Host an event
                <ArrowRight />
              </Link>
              <Link to="/join" className={buttonVariants({ size: 'xl', variant: 'outline' })}>
                <QrCode />
                Join with a code
              </Link>
            </div>
          </div>

          <div className="relative flex flex-col gap-4 lg:pl-6" aria-label="Preview of a player's pairing screen">
            <PairingCard match={demoMatch} viewerId="you" records={demoRecords} />
            <div className="rounded-2xl border border-line bg-surface/90 p-5 backdrop-blur">
              <MatchClock endsAt={null} pausedRemainingMs={DEMO_PAUSED_MS} roundMinutes={50} size="md" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-3">
        {[
          [
            'Scan in',
            'One QR code on the counter or the store TV. Players join from their phone in seconds — no app install.',
          ],
          [
            'Get paired',
            'Swiss pairings with Play! Pokémon points and tiebreakers. No rematches, fair byes, dropped players handled.',
          ],
          [
            'Report & climb',
            'Both players confirm the score. Standings, history and win rate update the moment the table is done.',
          ],
        ].map(([title, copy]) => (
          <div key={title} className="flex flex-col gap-3 border-t-2 border-orange pt-5">
            <h2 className="font-display text-2xl">{title}</h2>
            <p className="leading-relaxed text-paper-dim">{copy}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <EventList title="Live now" events={live} empty="No events are running right now." />
        <EventList
          title="Coming up"
          events={upcoming.slice(0, 6)}
          empty="Nothing scheduled yet — be the first store to host."
          more={upcoming.length > 6}
        />
      </section>
    </>
  )
}

function EventList({
  title,
  events,
  empty,
  more,
}: {
  title: string
  events: ReadonlyArray<import('#/server/events/views.ts').EventSummary>
  empty: string
  more?: boolean
}) {
  return (
    <div className="mb-14">
      <div className="mb-4 flex items-end justify-between gap-4 border-b border-line pb-4">
        <h2 className="font-display text-3xl">{title}</h2>
        <Link to="/events" className={cn(buttonVariants({ variant: 'link' }), more ? '' : 'hidden sm:inline-flex')}>
          All events <ArrowRight />
        </Link>
      </div>
      {events.length === 0 ? (
        <p className="py-6 text-paper-dim">{empty}</p>
      ) : (
        <div className="stagger -mx-3 flex flex-col sm:-mx-4">
          {events.map((event, index) => (
            <div key={event.id} style={{ ['--i' as string]: index }}>
              <EventRow event={event} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
