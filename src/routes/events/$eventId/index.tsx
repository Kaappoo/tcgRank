import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { CalendarDays, LogIn, MonitorPlay, Share2, Store, Trophy, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { HostDesk } from '#/components/events/host-desk.tsx'
import { JoinQrCard } from '#/components/events/join-qr.tsx'
import { MatchClock } from '#/components/events/match-clock.tsx'
import { PairingCard } from '#/components/events/pairing-card.tsx'
import { ReportResult } from '#/components/events/report-result.tsx'
import { RoundTables } from '#/components/events/round-tables.tsx'
import { StandingsTable } from '#/components/events/standings-table.tsx'
import { Page } from '#/components/layout/page.tsx'
import { Avatar } from '#/components/ui/avatar.tsx'
import { Badge, LiveDot } from '#/components/ui/badge.tsx'
import { Button, buttonVariants } from '#/components/ui/button.tsx'
import { Select } from '#/components/ui/select.tsx'
import { Tabs, TabsList, TabsPanel, TabsTab } from '#/components/ui/tabs.tsx'
import { toast } from '#/components/ui/toast.tsx'
import { useEventActions } from '#/hooks/use-event-actions.ts'
import { LocalTime } from '#/components/ui/local-time.tsx'
import { formatLabel, statusLabel } from '#/lib/format.ts'
import { eventQuery, myDecksQuery } from '#/lib/queries.ts'
import { absoluteUrl, seo } from '#/lib/seo.ts'
import { cn } from '#/lib/utils.ts'
import type { EventDetail, StandingView } from '#/server/events/views.ts'

export const Route = createFileRoute('/events/$eventId/')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(eventQuery(params.eventId)),
  head: ({ loaderData, params }) => ({
    meta: loaderData
      ? seo({
          title: `${loaderData.event.name} · tcgRank`,
          description: `${statusLabel(loaderData.event.status, loaderData.event.currentRound)} at ${loaderData.event.storeName} — ${loaderData.event.playerCount} players. Join with code ${loaderData.event.joinCode}.`,
          image: absoluteUrl(`/api/og/event/${params.eventId}`),
        })
      : [],
  }),
  component: EventHub,
})

function EventHub() {
  const { eventId } = Route.useParams()
  const { user } = Route.useRouteContext()
  const { data: detail, dataUpdatedAt } = useSuspenseQuery(eventQuery(eventId))
  const actions = useEventActions(eventId)
  const offsetMs = detail.serverNow - dataUpdatedAt
  const { event, viewer } = detail
  const origin = typeof window === 'undefined' ? absoluteUrl('/') : window.location.origin

  const records = useMemo(() => new Map(detail.standings.map((s) => [s.playerId, s])), [detail.standings])
  const currentRound = detail.rounds.find((r) => r.number === event.currentRound) ?? null
  const isHost = viewer?.isHost ?? false
  const busy = Object.values(actions).some((m) => m.isPending)

  const share = async () => {
    const url = window.location.href
    if (navigator.share) return navigator.share({ title: event.name, url }).catch(() => {})
    await navigator.clipboard.writeText(url)
    toast.success('Link copied', 'Paste it in your store group chat.')
  }

  return (
    <Page>
      <header className="mb-8 flex flex-col gap-5 border-b border-line pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={event.status === 'running' ? 'live' : event.status === 'finished' ? 'muted' : 'outline'}>
            {event.status === 'running' ? <LiveDot /> : null}
            {statusLabel(event.status, event.currentRound)}
          </Badge>
          <Badge variant="outline">{formatLabel(event.format)}</Badge>
          {isHost ? <Badge>You&apos;re hosting</Badge> : null}
        </div>
        <h1 className="font-display text-4xl sm:text-6xl">{event.name}</h1>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-paper-dim">
            <span className="inline-flex items-center gap-2">
              <Store className="size-4" /> {event.storeName}
            </span>
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="size-4" /> <LocalTime value={event.startsAt} />
            </span>
            <span className="inline-flex items-center gap-2">
              <Users className="size-4" /> <span className="tabular">{event.playerCount}</span> players
            </span>
            <span className="inline-flex items-center gap-2">
              <Avatar name={event.host.name} src={event.host.image} size="sm" className="size-5 text-[9px]" /> Hosted by{' '}
              {event.host.name}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {isHost && event.status !== 'finished' ? (
              <Link
                to="/events/$eventId/screen"
                params={{ eventId }}
                target="_blank"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <MonitorPlay /> Store screen
              </Link>
            ) : null}
            <Button variant="outline" size="sm" onClick={share}>
              <Share2 /> Share
            </Button>
          </div>
        </div>
        {event.description ? <p className="max-w-2xl whitespace-pre-line text-paper-dim">{event.description}</p> : null}
      </header>

      <div className="flex flex-col gap-6">
        {isHost ? (
          <HostDesk
            detail={detail}
            offsetMs={offsetMs}
            busy={busy}
            onStartRound={() => actions.startRound.mutate()}
            onFinish={() => actions.finish.mutate()}
            onClock={(action, deltaMinutes) => actions.clock.mutate({ action, deltaMinutes })}
          />
        ) : null}

        {viewer?.currentMatch && event.status === 'running' && currentRound ? (
          <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
            <PairingCard match={viewer.currentMatch} viewerId={viewer.userId} records={records} />
            <div className="flex flex-col gap-6">
              {!isHost ? (
                <div className="rounded-2xl border border-line bg-surface p-5">
                  <MatchClock
                    endsAt={currentRound.endsAt}
                    pausedRemainingMs={currentRound.pausedRemainingMs}
                    roundMinutes={event.roundMinutes}
                    offsetMs={offsetMs}
                    referenceNow={detail.serverNow}
                    size="md"
                  />
                </div>
              ) : null}
              {viewer.currentMatch.player2 ? (
                <ReportResult
                  match={viewer.currentMatch}
                  viewerId={viewer.userId}
                  isPending={actions.report.isPending || actions.confirm.isPending}
                  onReport={(games) => actions.report.mutate({ matchId: viewer.currentMatch!.id, ...games })}
                  onConfirm={() => actions.confirm.mutate(viewer.currentMatch!.id)}
                />
              ) : null}
            </div>
          </div>
        ) : null}

        {event.status === 'finished' ? <Podium standings={detail.standings} /> : null}

        <EntryPanel detail={detail} signedIn={Boolean(user)} busy={busy} actions={actions} />

        {isHost && event.status !== 'finished' ? (
          <JoinQrCard code={event.joinCode} eventName={event.name} origin={origin} />
        ) : null}

        <EventTabs
          detail={detail}
          onHostResult={(matchId, a, b) => actions.report.mutate({ matchId, player1Games: a, player2Games: b })}
        />
      </div>
    </Page>
  )
}

function EntryPanel({
  detail,
  signedIn,
  busy,
  actions,
}: {
  detail: EventDetail
  signedIn: boolean
  busy: boolean
  actions: ReturnType<typeof useEventActions>
}) {
  const { event, viewer } = detail
  const entry = viewer?.entry ?? null
  const { data: decks } = useQuery({ ...myDecksQuery, enabled: signedIn && event.status !== 'finished' })
  const [deckId, setDeckId] = useState<string>(entry?.deckId ?? 'none')

  if (event.status === 'finished' || (viewer?.isHost && !entry)) return null

  if (!signedIn) {
    return (
      <section className="flex flex-col gap-4 rounded-2xl border border-orange/40 bg-orange/[0.06] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl">Playing tonight?</h2>
          <p className="text-paper-dim">Sign in to join and get your pairings on this screen.</p>
        </div>
        <Link to="/sign-in" search={{ redirect: `/join/${event.joinCode}` }} className={buttonVariants({ size: 'lg' })}>
          <LogIn /> Sign in to join
        </Link>
      </section>
    )
  }

  if (entry && entry.droppedAtRound === null && event.status === 'running') {
    return (
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => actions.leave.mutate()}>
          Drop from event
        </Button>
      </div>
    )
  }

  const deckOptions = [
    { value: 'none', label: 'Decide later' },
    ...(decks ?? []).map((d) => ({ value: d.id, label: d.name })),
  ]

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl">
          {entry && entry.droppedAtRound === null ? "You're registered" : 'Join this event'}
        </h2>
        <p className="text-sm text-paper-dim">
          {entry && entry.droppedAtRound === null
            ? 'Your pairing appears here as soon as the host starts the round.'
            : 'Pick the deck you are registering — only you and the host see it until the event ends.'}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={deckId} onValueChange={(v) => v && setDeckId(v)} options={deckOptions} className="sm:w-60" />
        {entry && entry.droppedAtRound === null ? (
          <>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => actions.join.mutate(deckId === 'none' ? null : deckId)}
            >
              Update deck
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => actions.leave.mutate()}>
              Leave
            </Button>
          </>
        ) : (
          <Button size="lg" disabled={busy} onClick={() => actions.join.mutate(deckId === 'none' ? null : deckId)}>
            {entry ? 'Rejoin event' : 'Join event'}
          </Button>
        )}
      </div>
    </section>
  )
}

/** Final standings get a podium: the champion is the loudest thing on the page. */
function Podium({ standings }: { standings: ReadonlyArray<StandingView> }) {
  const [first, ...rest] = standings
  if (!first) return null
  return (
    <section
      aria-label="Podium"
      className="relative isolate grid overflow-hidden rounded-2xl border border-line bg-surface sm:grid-cols-[1.4fr_1fr]"
    >
      <div className="relative flex flex-col gap-4 p-6 sm:p-8">
        <div aria-hidden className="slab right-[-30%] w-[55%] animate-slab sm:hidden" />
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-orange">
          <Trophy className="size-4" /> Champion
        </p>
        <div className="flex items-center gap-5">
          <Avatar name={first.player.name} src={first.player.image} size="xl" className="ring-4 ring-orange" />
          <div className="min-w-0">
            <p className="truncate font-display text-4xl sm:text-5xl">{first.player.name}</p>
            <p className="tabular text-paper-dim">
              {first.points} pts · {first.wins + first.byes}-{first.losses}-{first.draws}
            </p>
          </div>
        </div>
      </div>
      <ol className="flex flex-col justify-center gap-3 border-t border-line p-6 sm:border-t-0 sm:border-l">
        {rest.slice(0, 3).map((s) => (
          <li key={s.playerId} className="flex items-center gap-4">
            <span className="font-numerals w-8 text-3xl text-paper-dim">{s.rank}</span>
            <Avatar name={s.player.name} src={s.player.image} size="sm" />
            <span className="truncate font-semibold">{s.player.name}</span>
            <span className="tabular ml-auto text-sm text-paper-dim">{s.points} pts</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function EventTabs({
  detail,
  onHostResult,
}: {
  detail: EventDetail
  onHostResult: (matchId: string, player1Games: number, player2Games: number) => void
}) {
  const { event, matches, rounds, standings, players, viewer } = detail
  const [roundNumber, setRoundNumber] = useState(event.currentRound)
  const shownRound = roundNumber || event.currentRound
  const roundMatches = matches.filter((m) => m.roundNumber === shownRound)
  const defaultTab = event.status === 'finished' ? 'standings' : event.currentRound > 0 ? 'pairings' : 'players'

  return (
    <Tabs key={defaultTab} defaultValue={defaultTab} className="mt-4">
      <TabsList>
        <TabsTab value="pairings" disabled={rounds.length === 0}>
          Pairings
        </TabsTab>
        <TabsTab value="standings" disabled={rounds.length === 0}>
          Standings
        </TabsTab>
        <TabsTab value="players">
          Players <span className="tabular text-paper-dim">{players.length}</span>
        </TabsTab>
      </TabsList>

      <TabsPanel value="pairings">
        {rounds.length > 1 ? (
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Choose round">
            {rounds.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={r.number === shownRound}
                onClick={() => setRoundNumber(r.number)}
                className="h-9 cursor-pointer rounded-full border border-line-strong px-4 text-sm font-semibold transition-colors aria-pressed:border-orange aria-pressed:bg-orange aria-pressed:text-on-orange"
              >
                Round {r.number}
              </button>
            ))}
          </div>
        ) : null}
        <RoundTables
          matches={roundMatches}
          viewerId={viewer?.userId}
          canEdit={viewer?.isHost}
          onSetResult={onHostResult}
        />
      </TabsPanel>

      <TabsPanel value="standings">
        <StandingsTable standings={standings} highlightId={viewer?.userId} final={event.status === 'finished'} />
        <p className="mt-3 text-xs text-paper-dim">
          Win 3 · Tie 1 · Loss 0. Ties broken by opponents&apos; win % (OMW, min 25%), then their opponents&apos;.
          {event.status !== 'finished' ? ' Only confirmed results count.' : ''}
        </p>
      </TabsPanel>

      <TabsPanel value="players">
        {players.length === 0 ? (
          <p className="py-6 text-paper-dim">Nobody has joined yet. Share the QR code to get people in.</p>
        ) : (
          <ul className="stagger grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((p, index) => (
              <li
                key={p.id}
                style={{ ['--i' as string]: index }}
                className={cn(
                  'flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3',
                  p.droppedAtRound !== null && 'opacity-60',
                )}
              >
                <Avatar name={p.name} src={p.image} size="sm" />
                <div className="min-w-0">
                  {p.username ? (
                    <Link
                      to="/u/$username"
                      params={{ username: p.username }}
                      className="block truncate font-semibold hover:text-orange"
                    >
                      {p.name}
                    </Link>
                  ) : (
                    <span className="block truncate font-semibold">{p.name}</span>
                  )}
                  {(event.status === 'finished' || viewer?.isHost || viewer?.userId === p.id) && p.deckName ? (
                    <p className="truncate text-xs text-paper-dim">{p.deckName}</p>
                  ) : null}
                </div>
                {p.droppedAtRound !== null ? (
                  <Badge variant="muted" className="ml-auto">
                    Dropped
                  </Badge>
                ) : null}
                {p.finalRank ? (
                  <span className="font-numerals ml-auto text-2xl text-paper-dim">#{p.finalRank}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </TabsPanel>
    </Tabs>
  )
}
