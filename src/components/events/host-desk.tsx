import { Flag, Minus, Pause, Play, Plus, Scissors, Shuffle } from 'lucide-react'
import { useState } from 'react'
import { BestOfField } from '#/components/forms/best-of-field.tsx'
import { PairingSystemField } from '#/components/forms/pairing-system-field.tsx'
import { SettingSwitch } from '#/components/forms/setting-switch.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Field, FieldLabel } from '#/components/ui/field.tsx'
import { Input } from '#/components/ui/input.tsx'
import type { BestOf } from '#/domain/best-of.ts'
import { eventBracket, finalRound, roundTitle, stageName } from '#/domain/bracket.ts'
import {
  allowedCutSizes,
  defaultCutSize,
  mainPhaseRounds,
  TOP_CUT_SIZES,
  type PairingSystem,
  type TopCutSize,
} from '#/domain/event-setup.ts'
import { pairRoundLabel, setupLine } from '#/lib/format.ts'
import type { EventDetail } from '#/server/events/views.ts'
import { MatchClock } from './match-clock.tsx'

export interface HostDeskProps {
  readonly detail: EventDetail
  readonly offsetMs: number
  readonly busy: boolean
  readonly onStartRound: () => void
  readonly onFinish: () => void
  /** Cuts a Swiss event to its top players after the last Swiss round. */
  readonly onCut: (cut: { size: TopCutSize; roundMinutes: number }) => void
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
  onCut,
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
  const bracket = eventBracket({ ...event, plannedRounds })
  const topCut = bracket?.topCutSize !== undefined ? bracket : null
  const lastRound = event.currentRound >= (topCut ? finalRound(topCut) : plannedRounds)
  // After the last Swiss round of an event with a top cut, the next step is the cut.
  const cutDue = event.topCut && topCut === null && lastRound && event.currentRound > 0
  const stageOf = (roundNumber: number) => (bracket ? stageName(bracket, roundNumber) : null)
  const currentStage = stageOf(event.currentRound)
  // A half-played bracket has no champion, so it can't be published early.
  const bracketStarted = rounds.some((r) => r.elimination)

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
              {event.pairingSystem === 'single_elimination' ? ' Pairing round 1 draws the seeds and closes entries.' : ''}
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
                {topCut && event.currentRound >= topCut.firstRound
                  ? roundTitle(topCut, event.currentRound)
                  : `${currentStage ? `${currentStage} · ` : ''}Round ${event.currentRound} of ${plannedRounds}${event.topCut ? ' · then top cut' : ''}`}
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

        {cutDue ? (
          <CutStep
            attendance={players.length}
            activePlayers={activePlayers}
            roundMinutes={event.roundMinutes}
            ready={roundComplete && !busy}
            busy={busy}
            onCut={onCut}
            onFinish={onFinish}
          />
        ) : lastRound && event.currentRound > 0 ? (
          <Button size="lg" disabled={busy || !roundComplete} onClick={onFinish}>
            <Flag /> Finish & publish standings
          </Button>
        ) : (
          <Button
            size="lg"
            disabled={busy || (event.currentRound > 0 && !roundComplete) || activePlayers < 2}
            onClick={onStartRound}
          >
            <Shuffle />{' '}
            {event.currentRound === 0 ? 'Pair round 1' : pairRoundLabel(event.currentRound + 1, stageOf(event.currentRound + 1))}
          </Button>
        )}
        {!lastRound && (event.currentRound === 0 || roundComplete) ? <MissingDecks count={withoutDeck} /> : null}
        {event.currentRound > 0 && !roundComplete ? (
          <p className="text-xs text-paper-dim">Next round unlocks when every table has a confirmed result.</p>
        ) : null}
        {!lastRound && event.currentRound > 0 && roundComplete && !bracketStarted ? (
          <Button variant="ghost" size="sm" disabled={busy} onClick={onFinish}>
            End event early
          </Button>
        ) : null}
      </div>
    </section>
  )
}

/**
 * The cut step after the last Swiss round: the cut size (default from attendance, never more than the players still
 * in) and the top cut round timer, with finishing still on offer. Below 9 players finishing is the default and the
 * cut sits behind "Cut anyway".
 */
function CutStep({
  attendance,
  activePlayers,
  roundMinutes,
  ready,
  busy,
  onCut,
  onFinish,
}: {
  attendance: number
  activePlayers: number
  roundMinutes: number
  ready: boolean
  busy: boolean
  onCut: HostDeskProps['onCut']
  onFinish: () => void
}) {
  const suggested = defaultCutSize(attendance)
  const allowed = allowedCutSizes(activePlayers)
  const [cutting, setCutting] = useState(suggested !== null)
  const [size, setSize] = useState<TopCutSize | null>(
    () => allowed.filter((n) => n <= (suggested ?? 4)).at(-1) ?? null,
  )
  const [minutes, setMinutes] = useState(roundMinutes)
  const validMinutes = Number.isInteger(minutes) && minutes >= 10 && minutes <= 120

  if (!cutting || size === null) {
    return (
      <div className="flex flex-col gap-2">
        <Button size="lg" disabled={!ready} onClick={onFinish}>
          <Flag /> Finish & publish standings
        </Button>
        {suggested === null ? (
          <p className="text-xs text-paper-dim">Fewer than 9 players: League Cups only cut from 9.</p>
        ) : null}
        {size !== null ? (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setCutting(true)}>
            Cut anyway
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-2" disabled={busy}>
        <legend className="mb-2 text-sm font-semibold">Top cut</legend>
        <div className="flex flex-wrap gap-2">
          {TOP_CUT_SIZES.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={size === n}
              disabled={!allowed.includes(n)}
              onClick={() => setSize(n)}
              className="h-11 cursor-pointer rounded-lg border border-line-strong px-4 text-sm font-semibold transition-colors hover:border-paper-dim disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:border-orange aria-pressed:bg-orange aria-pressed:text-on-orange"
            >
              Top <span className="tabular">{n}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <Field>
        <FieldLabel>Top cut round timer (minutes)</FieldLabel>
        <Input
          type="number"
          min={10}
          max={120}
          value={minutes}
          disabled={busy}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="w-24"
        />
      </Field>
      <p className="text-xs text-paper-dim">Cutting seeds the top players by Swiss rank and closes entries.</p>
      <Button size="lg" disabled={!ready || !validMinutes} onClick={() => onCut({ size, roundMinutes: minutes })}>
        <Scissors /> Cut to top {size}
      </Button>
      <Button variant="ghost" size="sm" disabled={!ready} onClick={onFinish}>
        Finish & publish standings
      </Button>
    </div>
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
