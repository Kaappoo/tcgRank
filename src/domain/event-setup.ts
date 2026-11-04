/**
 * Event setup rules: the pairing system, whether a Swiss event has a top cut,
 * and how many rounds the main phase plays. Pure, no IO.
 */
import { recommendedRounds } from './swiss.ts'

export const PAIRING_SYSTEMS = ['swiss', 'round_robin', 'single_elimination'] as const
export type PairingSystem = (typeof PAIRING_SYSTEMS)[number]
export const DEFAULT_PAIRING_SYSTEM: PairingSystem = 'swiss'

/** Allowed top cut sizes. */
const TOP_CUT_SIZES = [2, 4, 8] as const
export type TopCutSize = (typeof TOP_CUT_SIZES)[number]

/** Below 9 players no cut by default; top 4 for 9–20 players, top 8 for 21 or more. */
export const defaultCutSize = (playerCount: number): TopCutSize | null =>
  playerCount < 9 ? null : playerCount <= 20 ? 4 : 8

/** Everyone plays everyone once: N−1 rounds for an even field, N for an odd one (one bye each). */
const roundRobinRounds = (playerCount: number): number => {
  const n = Math.max(2, playerCount)
  return n % 2 === 0 ? n - 1 : n
}

/** Rounds of a single-elimination bracket: ceil(log2 N). */
const eliminationRounds = (playerCount: number): number => Math.ceil(Math.log2(Math.max(2, playerCount)))

export interface MainPhaseInput {
  readonly pairingSystem: PairingSystem
  readonly topCut: boolean
  /** `events.plannedRounds`: a count the host set (Swiss), or the count fixed at round 1. 0 means not set. */
  readonly plannedRounds: number
  readonly playerCount: number
}

/**
 * Rounds in the main phase: Swiss rounds (top cut rounds not included), the
 * round-robin schedule, or the bracket. A stored count wins.
 */
export const mainPhaseRounds = ({ pairingSystem, topCut, plannedRounds, playerCount }: MainPhaseInput): number => {
  if (plannedRounds > 0) return plannedRounds
  switch (pairingSystem) {
    case 'swiss':
      return recommendedRounds(playerCount, { topCut })
    case 'round_robin':
      return roundRobinRounds(playerCount)
    case 'single_elimination':
      return eliminationRounds(playerCount)
  }
}
