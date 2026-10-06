import { Flag, Minus, Pause, Play, Plus, Shuffle } from 'lucide-react'
import { Button } from '#/components/ui/button.tsx'
import { recommendedRounds } from '#/domain/swiss.ts'
import type { EventDetail } from '#/server/events/views.ts'
import { MatchClock } from './match-clock.tsx'

export interface HostDeskProps {
  readonly detail: EventDetail
  readonly offsetMs: number
  readonly busy: boolean
  readonly onStartRound: () => void
  readonly onFinish: () => void
  readonly onClock: (action: 'pause' | 'resume' | 'adjust', deltaMinutes?: number) => void
}

/** The host's control surface: one primary action at a time, clock controls beside it. */
export function HostDesk({ detail, offsetMs, busy, onStartRound, onFinish, onClock }: HostDeskProps) {
  const { event, rounds, matches, players } = detail
  const round = rounds.find((r) => r.number === event.currentRound) ?? null
  const roundMatches = matches.filter((m) => m.roundNumber === event.currentRound)
  const confirmed = roundMatches.filter((m) => m.status === 'confirmed').length
  const activePlayers = players.filter((p) => p.droppedAtRound === null).length
  const plannedRounds = event.plannedRounds > 0 ? event.plannedRounds : recommendedRounds(players.length)
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
              {plannedRounds} Swiss rounds of {event.roundMinutes} minutes. Pair round 1 once everyone has scanned in.
            </p>
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
