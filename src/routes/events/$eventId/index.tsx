import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { CalendarDays, MonitorPlay, Share2, Store, Trophy, Users } from 'lucide-react'
import { useMemo, type ComponentProps } from 'react'
import { z } from 'zod'
import { AddGuestForm, GuestRowActions } from '#/components/events/guests.tsx'
import { EntryPanel } from '#/components/events/entry-panel.tsx'
import { DeleteEventButton } from '#/components/events/delete-event.tsx'
import { HostDesk } from '#/components/events/host-desk.tsx'
import { JoinQrCard } from '#/components/events/join-qr.tsx'
import { MatchClock } from '#/components/events/match-clock.tsx'
import { PairingCard } from '#/components/events/pairing-card.tsx'
import { PairingsPanel } from '#/components/events/pairings-panel.tsx'
import { ReportResult } from '#/components/events/report-result.tsx'
import { RoundTables } from '#/components/events/round-tables.tsx'
import { StandingsTable } from '#/components/events/standings-table.tsx'
import { Page } from '#/components/layout/page.tsx'
import { Avatar } from '#/components/ui/avatar.tsx'
import { Badge, LiveDot } from '#/components/ui/badge.tsx'
import { Button, buttonVariants } from '#/components/ui/button.tsx'
import { Tabs, TabsList, TabsPanel, TabsTab } from '#/components/ui/tabs.tsx'
import { toast } from '#/components/ui/toast.tsx'
import { errorMessage, useEventActions } from '#/hooks/use-event-actions.ts'
import { LocalTime } from '#/components/ui/local-time.tsx'
import { formatLabel, podiumLine, setupSummary, statusLabel } from '#/lib/format.ts'
import { tiebreakersFor } from '#/domain/standings.ts'
import { eventQuery } from '#/lib/queries.ts'
import { absoluteUrl, seo } from '#/lib/seo.ts'
import { cn } from '#/lib/utils.ts'
import type { EventDetail, StandingView } from '#/server/events/views.ts'

export const Route = createFileRoute('/events/$eventId/')({
  /** `deck`: a deck just created while joining, to preselect. */
  validateSearch: z.object({ deck: z.string().optional() }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(eventQuery(params.eventId)),
  head: ({ loaderData, params }) => ({
    meta: loaderData
      ? seo({
          title: `${loaderData.event.name} · tcgRank`,
          description: `${statusLabel(loaderData.event)} at ${loaderData.event.storeName} — ${loaderData.event.playerCount} players. Join with code ${loaderData.event.joinCode}.`,
          image: absoluteUrl(`/api/og/event/${params.eventId}`),
        })
      : [],
  }),
  component: EventHub,
})

function EventHub() {
  const { eventId } = Route.useParams()
  const { user } = Route.useRouteContext()
  const { deck: createdDeck } = Route.useSearch()
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
            {statusLabel(event)}
          </Badge>
          <Badge variant="outline">{formatLabel(event.format)}</Badge>
          <Badge variant="outline">{setupSummary(event)}</Badge>
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
              <Avatar avatar={event.host.avatar} size={24} /> Hosted by {event.host.name}
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
            {isHost && event.status === 'registration' ? (
              <DeleteEventButton eventId={eventId} eventName={event.name} />
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
            onCut={(cut) => actions.cut.mutate(cut)}
            onClock={(action, deltaMinutes) => actions.clock.mutate({ action, deltaMinutes })}
            onDeckRequired={(required) => actions.deckRequired.mutate(required)}
            onBestOf={(bestOf) => actions.bestOf.mutate(bestOf)}
            onPairingSystem={(pairingSystem) => actions.pairingSystem.mutate(pairingSystem)}
            onTopCut={(topCut) => actions.topCut.mutate(topCut)}
          />
        ) : null}

        {viewer?.currentMatch && event.status === 'running' && currentRound ? (
          <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
            <PairingCard match={viewer.currentMatch} viewerId={viewer.userId} bestOf={event.bestOf} records={records} />
            <div className="flex flex-col gap-6">
              {!isHost ? (
                <div className="rounded-2xl border border-line bg-surface p-5">
                  <MatchClock
                    endsAt={currentRound.endsAt}
                    pausedRemainingMs={currentRound.pausedRemainingMs}
                    roundMinutes={currentRound.minutes}
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
                  bestOf={event.bestOf}
                  elimination={currentRound.elimination}
                  isPending={actions.report.isPending || actions.confirm.isPending}
                  onReport={(games) => actions.report.mutate({ matchId: viewer.currentMatch!.id, ...games })}
                  onConfirm={() => actions.confirm.mutate(viewer.currentMatch!.id)}
                />
              ) : null}
            </div>
          </div>
        ) : null}

        {event.status === 'finished' ? (
          <Podium standings={detail.standings} topCut={event.topCutSize !== null} />
        ) : null}

        <EntryPanel detail={detail} signedIn={Boolean(user)} busy={busy} actions={actions} createdDeck={createdDeck} />

        {isHost && event.status !== 'finished' ? (
          <JoinQrCard code={event.joinCode} eventName={event.name} origin={origin} />
        ) : null}

        <EventTabs
          detail={detail}
          origin={origin}
          busy={busy}
          onHostResult={(matchId, a, b, saved) =>
            actions.correct.mutate({ matchId, player1Games: a, player2Games: b }, { onSuccess: saved })
          }
          correction={{
            isPending: actions.correct.isPending,
            error: actions.correct.error ? errorMessage(actions.correct.error) : null,
          }}
          onAddGuest={(guest, done) => actions.addGuest.mutate(guest, { onSuccess: done })}
          onRemoveGuest={(guestId) => actions.removeGuest.mutate(guestId)}
        />
      </div>
    </Page>
  )
}

/** Final standings get a podium: the champion is the loudest thing on the page. */
function Podium({ standings, topCut }: { standings: ReadonlyArray<StandingView>; topCut: boolean }) {
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
          <Avatar avatar={first.player.avatar} size={112} className="ring-4 ring-orange" />
          <div className="min-w-0">
            <p className="truncate font-display text-4xl sm:text-5xl">{first.player.name}</p>
            <p className="tabular text-paper-dim">{podiumLine(first, { topCut })}</p>
          </div>
        </div>
      </div>
      <ol className="flex flex-col justify-center gap-3 border-t border-line p-6 sm:border-t-0 sm:border-l">
        {rest.slice(0, 3).map((s) => (
          <li key={s.playerId} className="flex items-center gap-4">
            <span className="font-numerals w-8 text-3xl text-paper-dim">{s.rank}</span>
            <Avatar avatar={s.player.avatar} size={32} />
            <span className="truncate font-semibold">{s.player.name}</span>
            <span className="tabular ml-auto text-sm text-paper-dim">
              {s.stage ? podiumLine(s, { topCut }) : `${s.points} pts`}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function EventTabs({
  detail,
  origin,
  busy,
  onHostResult,
  correction,
  onAddGuest,
  onRemoveGuest,
}: {
  detail: EventDetail
  origin: string
  busy: boolean
  onHostResult: ComponentProps<typeof RoundTables>['onSetResult']
  correction: ComponentProps<typeof RoundTables>['correction']
  onAddGuest: (guest: { name: string } | { guestId: string }, done: () => void) => void
  onRemoveGuest: (guestId: string) => void
}) {
  const { event, rounds, standings, players, viewer } = detail
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
        <PairingsPanel
          detail={detail}
          viewerId={viewer?.userId}
          canEdit={viewer?.isHost}
          onSetResult={onHostResult}
          correction={correction}
        />
      </TabsPanel>

      <TabsPanel value="standings">
        <StandingsTable
          standings={standings}
          highlightId={viewer?.userId}
          final={event.status === 'finished'}
          tiebreakers={tiebreakersFor(event.pairingSystem)}
          topCutSize={event.topCutSize}
        />
        <p className="mt-3 text-xs text-paper-dim">
          {event.topCutSize === null
            ? ''
            : event.status === 'finished'
              ? 'Final placement follows the stage reached in the top cut, then Swiss rank; everyone else follows in Swiss order. The columns show the Swiss rounds. '
              : 'The top cut is listed first, by seed, with the stage each player has reached. The columns show the Swiss rounds. '}
          {event.pairingSystem === 'single_elimination'
            ? 'Final placement follows the round a player went out in; players out in the same round share it. Byes only advance a player.'
            : event.pairingSystem === 'round_robin'
              ? 'Win 3 · Tie 1 · Loss 0 · Bye 3. A tie between two players goes to the winner of their match (H2H), then game-win % (GW%), then opponents’ win % (OMW, min 25%).'
              : 'Win 3 · Tie 1 · Loss 0. Ties broken by opponents’ win % (OMW, min 25%), then their opponents’.'}
          {event.status !== 'finished' ? ' Only confirmed results count.' : ''}
        </p>
      </TabsPanel>

      <TabsPanel value="players">
        {viewer?.isHost && event.status !== 'finished' ? (
          <AddGuestForm players={players} busy={busy} onAdd={onAddGuest} closedReason={event.entriesClosedReason} />
        ) : null}
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
                <Avatar avatar={p.avatar} size={32} />
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
                  ) : p.isGuest ? (
                    <p className="text-xs text-paper-dim">Guest · no account</p>
                  ) : null}
                </div>
                {p.droppedAtRound !== null ? (
                  <Badge variant="muted" className="ml-auto">
                    Dropped
                  </Badge>
                ) : viewer?.isHost &&
                  event.deckRequired &&
                  !p.isGuest &&
                  p.deckId === null &&
                  event.status !== 'finished' ? (
                  <Badge variant="loss" className="ml-auto">
                    No deck
                  </Badge>
                ) : null}
                {p.finalRank ? (
                  <span className="font-numerals ml-auto text-2xl text-paper-dim">#{p.finalRank}</span>
                ) : null}
                {viewer?.isHost && p.isGuest && event.status !== 'finished' ? (
                  <GuestRowActions
                    guest={p}
                    origin={origin}
                    started={event.status !== 'registration'}
                    busy={busy}
                    onRemove={() => onRemoveGuest(p.id)}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </TabsPanel>
    </Tabs>
  )
}
