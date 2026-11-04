import { Flag, Minus, Pause, Play, Plus, Shuffle } from 'lucide-react'
import { BestOfField } from '#/components/forms/best-of-field.tsx'
import { PairingSystemField } from '#/components/forms/pairing-system-field.tsx'
import { SettingSwitch } from '#/components/forms/setting-switch.tsx'
import { Button } from '#/components/ui/button.tsx'
import type { BestOf } from '#/domain/best-of.ts'
import { mainPhaseRounds, type PairingSystem } from '#/domain/event-setup.ts'
import { setupLine } from '#/lib/format.ts'
import type { EventDetail } from '#/server/events/views.ts'
import { MatchClock } from './match-clock.tsx'

export interface HostDeskProps {
  readonly detail: EventDetail
  readonly offsetMs: number
  readonly busy: boolean
  readonly onStartRound: () => void
  readonly onFinish: () => void
  readonly onClock: (action: 'pause' | 'resume' | 'adjust', deltaMinutes?: number) => void
  readonly onDeckRequired: (required: boolean) => void
  readonly onBestOf: (bestOf: BestOf) => void
  readonly onPairingSystem: (pairingSystem: PairingSystem) => void
  readonly onTopCut: (topCut: boolean) => void
}

/** Above this many players a round robin needs more rounds than a night usually has. */
const LONG_ROUND_ROBIN = 10

/** The host's control surface: one primary action at a time, clock controls beside it. */
export function HostDesk({
  detail,
  offsetMs,
  busy,
  onStartRound,
  onFinish,
  onClock,
  onDeckRequired,
  onBestOf,
  onPairingSystem,
  onTopCut,
}: HostDeskProps) {
  const { event, rounds, matches, players } = detail
  const round = rounds.find((r) => r.number === event.currentRound) ?? null
  const roundMatches = matches.filter((m) => m.roundNumber === event.currentRound)
  const confirmed = roundMatches.filter((m) => m.status === 'confirmed').length
  const activePlayers = players.filter((p) => p.droppedAtRound === null).length
  const withoutDeck = event.deckRequired ? players.filter((p) => p.droppedAtRound === null && !p.isGuest && !p.deckId).length : 0
  const plannedRounds = mainPhaseRounds({ ...event, playerCount: players.length })
  const roundComplete = roundMatches.length > 0 && confirmed === roundMatches.length
  const lastRound = event.currentRound >= plannedRounds

  if (event.status === 'finished') return null

  return (
    <section
      aria-label="Host controls"
      className="grid gap-6 rounded-2xl border border-line bg-surface p-5 sm:p-6 lg:grid-cols-[1.3fr_1fr]"
    >
      <div className="flex flex-col gap-4">
        {round && round.status === 'active' ? (
          <>
            <MatchClock
              endsAt={round.endsAt}
              pausedRemainingMs={round.pausedRemainingMs}
              roundMinutes={event.roundMinutes}
              offsetMs={offsetMs}
              referenceNow={detail.serverNow}
              size="md"
            />
            <div className="flex flex-wrap gap-2">
              {round.endsAt === null ? (
                <Button variant="secondary" size="sm" disabled={busy} onClick={() => onClock('resume')}>
                  <Play /> Resume
                </Button>
              ) : (
                <Button variant="secondary" size="sm" disabled={busy} onClick={() => onClock('pause')}>
                  <Pause /> Pause
                </Button>
              )}
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => onClock('adjust', 1)}>
                <Plus /> 1 min
              </Button>
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => onClock('adjust', 5)}>
                <Plus /> 5 min
              </Button>
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => onClock('adjust', -1)}>
                <Minus /> 1 min
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="font-display text-3xl">{activePlayers} players checked in</p>
            <p className="text-sm text-paper-dim">
              {setupLine(event, players.length)}. Pair round 1 once everyone has scanned in.
              {event.pairingSystem === 'round_robin' ? ' Pairing round 1 draws the schedule and closes entries.' : ''}
            </p>
            {event.pairingSystem === 'round_robin' && players.length > LONG_ROUND_ROBIN ? (
              <p className="text-sm text-loss">
                {players.length} players means {plannedRounds} rounds: a round robin this size will run long. Swiss fits
                a night better.
              </p>
            ) : null}
            <EventSetup
              event={event}
              busy={busy}
              onDeckRequired={onDeckRequired}
              onBestOf={onBestOf}
              onPairingSystem={onPairingSystem}
              onTopCut={onTopCut}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col justify-between gap-4 border-t border-line pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
        {event.currentRound > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold">
                Round {event.currentRound} of {plannedRounds}
              </span>
              <span className="tabular text-paper-dim">
                {confirmed}/{roundMatches.length} results in
              </span>
            </div>
            <div className="flex h-2 gap-1" aria-hidden>
              {roundMatches.map((m) => (
                <span
                  key={m.id}
                  className={`h-full flex-1 rounded-full transition-colors duration-500 ${
                    m.status === 'confirmed'
                      ? 'bg-orange'
                      : m.status === 'reported'
                        ? 'bg-ember/50'
                        : 'bg-surface-raised'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : null}

        {lastRound && event.currentRound > 0 ? (
          <Button size="lg" disabled={busy || !roundComplete} onClick={onFinish}>
            <Flag /> Finish & publish standings
          </Button>
        ) : (
          <Button
            size="lg"
            disabled={busy || (event.currentRound > 0 && !roundComplete) || activePlayers < 2}
            onClick={onStartRound}
          >
            <Shuffle /> {event.currentRound === 0 ? 'Pair round 1' : `Pair round ${event.currentRound + 1}`}
          </Button>
        )}
        {!lastRound && (event.currentRound === 0 || roundComplete) ? <MissingDecks count={withoutDeck} /> : null}
        {event.currentRound > 0 && !roundComplete ? (
          <p className="text-xs text-paper-dim">Next round unlocks when every table has a confirmed result.</p>
        ) : null}
        {!lastRound && event.currentRound > 0 && roundComplete ? (
          <Button variant="ghost" size="sm" disabled={busy} onClick={onFinish}>
            End event early
          </Button>
        ) : null}
      </div>
    </section>
  )
}

/** The event setup: editable during registration, shown locked once round 1 starts. */
function EventSetup({
  event,
  busy,
  onDeckRequired,
  onBestOf,
  onPairingSystem,
  onTopCut,
}: Pick<HostDeskProps, 'busy' | 'onDeckRequired' | 'onBestOf' | 'onPairingSystem' | 'onTopCut'> & {
  event: EventDetail['event']
}) {
  const open = event.status === 'registration'
  const locked = busy || !open
  const fixed = 'Fixed once round 1 starts.'
  return (
    <fieldset className="mt-2 flex flex-col gap-3">
      <legend className="sr-only">Event setup</legend>
      <div className="rounded-lg border border-line px-4 py-3">
        <PairingSystemField value={event.pairingSystem} onChange={onPairingSystem} disabled={locked} />
      </div>
      {event.pairingSystem === 'swiss' ? (
        <SettingSwitch
          title="Top cut"
          description={`The best players play a bracket after the Swiss rounds. ${fixed}`}
          checked={event.topCut}
          disabled={locked}
          onChange={onTopCut}
        />
      ) : null}
      <div className="rounded-lg border border-line px-4 py-3">
        <BestOfField value={event.bestOf} onChange={onBestOf} disabled={locked} hint={open ? undefined : fixed} />
      </div>
      <SettingSwitch
        title="Require a deck"
        description={`Players must register a 60-card deck to join. ${fixed}`}
        checked={event.deckRequired}
        disabled={locked}
        onChange={onDeckRequired}
      />
    </fieldset>
  )
}

/** Pairing still goes ahead: the host has the final say at the table. */
function MissingDecks({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <p className="text-xs text-loss">
      {count === 1 ? '1 player has' : `${count} players have`} not registered a deck. You can still pair them.
    </p>
  )
}
