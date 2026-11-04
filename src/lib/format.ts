import type { BestOf } from '#/domain/best-of.ts'
import { eventBracket, roundName, type Stage } from '#/domain/bracket.ts'
import { defaultCutSize, mainPhaseRounds, type PairingSystem } from '#/domain/event-setup.ts'
import type { EventFormat, EventStatus } from '#/server/db/schema.ts'

const FORMAT_LABELS: Record<EventFormat, string> = {
  standard: 'Standard',
  expanded: 'Expanded',
  glc: 'Gym Leader Challenge',
  unlimited: 'Unlimited',
}

export const formatLabel = (format: EventFormat): string => FORMAT_LABELS[format]

export const bestOfLabel = (bestOf: BestOf): string => `Best of ${bestOf}`

const PAIRING_SYSTEM_LABELS: Record<PairingSystem, string> = {
  swiss: 'Swiss',
  round_robin: 'Round robin',
  single_elimination: 'Single elimination',
}

export const pairingSystemLabel = (pairingSystem: PairingSystem): string => PAIRING_SYSTEM_LABELS[pairingSystem]

interface EventSetup {
  readonly pairingSystem: PairingSystem
  readonly topCut: boolean
  readonly bestOf: BestOf
}

/** The short setup line players see: "Swiss · Top cut · Best of 3". */
export const setupSummary = ({ pairingSystem, topCut, bestOf }: EventSetup): string =>
  [pairingSystemLabel(pairingSystem), ...(topCut ? ['Top cut'] : []), bestOfLabel(bestOf)].join(' · ')

const roundsOf = (n: number, minutes: number, kind = '') =>
  `${n} ${kind}${n === 1 ? 'round' : 'rounds'} of ${minutes} minutes`

/**
 * How long the night runs at the current attendance, for the host:
 * "5 Swiss rounds of 50 minutes, then top 8", "Round robin: 7 rounds of 50 minutes",
 * "Single elimination: 3 rounds of 50 minutes, best of 3".
 */
export const setupLine = (
  event: EventSetup & { readonly plannedRounds: number; readonly roundMinutes: number },
  playerCount: number,
): string => {
  const rounds = mainPhaseRounds({ ...event, playerCount })
  switch (event.pairingSystem) {
    case 'swiss': {
      const swiss = roundsOf(rounds, event.roundMinutes, 'Swiss ')
      if (!event.topCut) return swiss
      const cut = defaultCutSize(playerCount)
      return cut === null ? `${swiss}, top cut from 9 players` : `${swiss}, then top ${cut}`
    }
    case 'round_robin':
      return `Round robin: ${roundsOf(rounds, event.roundMinutes)}`
    case 'single_elimination':
      return `Single elimination: ${roundsOf(rounds, event.roundMinutes)}, ${bestOfLabel(event.bestOf).toLowerCase()}`
  }
}

const STAGE_PAIRINGS: Record<Stage, string> = {
  Final: 'final',
  Semifinal: 'semifinals',
  Quarterfinal: 'quarterfinals',
}

/** The host's pairing button: "Pair semifinals", "Pair final", or "Pair round N" outside the named stages. */
export const pairRoundLabel = (roundNumber: number, stage: Stage | null): string =>
  stage ? `Pair ${STAGE_PAIRINGS[stage]}` : `Pair round ${roundNumber}`

/** "Registration open", "Round N live" (or "{round name} live", e.g. "Semifinal live"), "Final standings". */
export const statusLabel = (status: EventStatus, currentRound: number, roundLabel: string | null = null): string => {
  if (status === 'registration') return 'Registration open'
  if (status === 'finished') return 'Final standings'
  return `${roundLabel ?? `Round ${currentRound}`} live`
}

/**
 * What the current round of a bracket is called while it's live: its stage ("Semifinal", "Final"), or "Round N"
 * early in a bracket larger than 8. Null outside a bracket.
 */
export const bracketRoundLabel = (event: {
  readonly pairingSystem: PairingSystem
  readonly plannedRounds: number
  readonly currentRound: number
}): string | null => {
  const bracket = eventBracket(event)
  if (!bracket || event.currentRound < bracket.firstRound) return null
  // The one place a top cut's first round gets its "Top N" name ("Top 8 live") once the bracket rules give it.
  return roundName(bracket, event.currentRound)
}

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
