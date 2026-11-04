/**
 * Where an event stands in its rounds: how many the main phase plays, the
 * bracket it plays (if any), whether another round can be paired and whether
 * the top cut is next. The service exposes this so every view reads the same
 * rules. Pure, no IO.
 */
import { eventBracket, finalRound, type Bracket } from './bracket.ts'
import { mainPhaseRounds, type PairingSystem } from './event-setup.ts'

interface ProgressEvent {
  readonly pairingSystem: PairingSystem
  readonly topCut: boolean
  readonly topCutSize: number | null
  /** `events.plannedRounds`: 0 until set by the host (Swiss) or fixed at round 1. */
  readonly plannedRounds: number
  readonly currentRound: number
}

export interface EventProgress {
  /** Rounds in the main phase at the current attendance: Swiss rounds, the schedule or the bracket. */
  readonly mainPhaseRounds: number
  /** The bracket the event plays: a single-elimination event from round 1, or a Swiss event's top cut once cut. */
  readonly bracket: Bracket | null
  /** Every round the event plays so far has been paired: the next step is finishing (or the cut). */
  readonly isLastRound: boolean
  /** The last Swiss round of an event with a top cut has been paired and the cut hasn't: cutting comes next. */
  readonly cutDue: boolean
}

const PLAYED_OUT: Record<PairingSystem, (rounds: number) => string> = {
  swiss: (rounds) => `All ${rounds} Swiss rounds have been played`,
  round_robin: (rounds) => `All ${rounds} rounds of the schedule have been played`,
  single_elimination: () => 'The final has been played',
}

/** Why no further round can be paired (every round the event plays is done), or null while one can. */
export const nextRoundRefusal = (event: ProgressEvent, plannedRounds: number): string | null => {
  const bracket = eventBracket({ ...event, plannedRounds })
  if (bracket?.topCutSize !== undefined) {
    return event.currentRound >= finalRound(bracket) ? 'The final has been played' : null
  }
  return event.currentRound < plannedRounds ? null : PLAYED_OUT[event.pairingSystem](plannedRounds)
}

export const eventProgress = (event: ProgressEvent, playerCount: number): EventProgress => {
  const rounds = mainPhaseRounds({ ...event, playerCount })
  const bracket = eventBracket({ ...event, plannedRounds: rounds })
  const isLastRound = nextRoundRefusal(event, rounds) !== null
  return {
    mainPhaseRounds: rounds,
    bracket,
    isLastRound,
    cutDue: event.topCut && event.topCutSize === null && isLastRound && event.currentRound > 0,
  }
}
