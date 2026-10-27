/**
 * Best-of score rules: which game scores a match can end on.
 *
 * A match is played over the event's best-of (1, 3 or 5 games). A player who wins the majority
 * wins the match. A score where neither side reached the majority is an incomplete report: still
 * valid, scored by who has more games. Whether equal games are allowed is a flag on the score
 * rules so rounds that can't end in a tie (elimination rounds) can refuse them.
 */
import type { Outcome } from './standings.ts'

export const BEST_OF_VALUES = [1, 3, 5] as const
export type BestOf = (typeof BEST_OF_VALUES)[number]
export const DEFAULT_BEST_OF: BestOf = 3
/** The most games either side can ever report, across every best-of. */
export const MAX_GAMES = 3

export interface ScoreRules {
  readonly bestOf: BestOf
  /** False in rounds that can't end in a tie: equal games are then an invalid score. */
  readonly allowEqualGames: boolean
}

export const scoreRules = (bestOf: BestOf, options: { allowEqualGames?: boolean } = {}): ScoreRules => ({
  bestOf,
  allowEqualGames: options.allowEqualGames ?? true,
})

/** Games needed to win a match: 1, 2 or 3. */
export const majority = (bestOf: BestOf): number => Math.ceil(bestOf / 2)

/** Highest value one side's stepper may reach, given the other side's games: both can't be at the majority. */
export const stepperMax = (rules: ScoreRules, otherGames: number): number => {
  const m = majority(rules.bestOf)
  return otherGames >= m ? m - 1 : m
}

const plural = (n: number) => (n === 1 ? `${n} game` : `${n} games`)

/** Why a score can't happen under these rules, or null when it is valid. */
export const invalidScoreReason = (rules: ScoreRules, player1Games: number, player2Games: number): string | null => {
  const m = majority(rules.bestOf)
  const inRange = (g: number) => Number.isInteger(g) && g >= 0 && g <= m
  if (!inRange(player1Games) || !inRange(player2Games) || (player1Games === m && player2Games === m)) {
    return `A best of ${rules.bestOf} ends at ${plural(m)}`
  }
  if (!rules.allowEqualGames && player1Games === player2Games) return 'This match can’t end in a tie'
  return null
}

export const isValidScore = (rules: ScoreRules, player1Games: number, player2Games: number): boolean =>
  invalidScoreReason(rules, player1Games, player2Games) === null

/** A side reached the majority. Anything else is an incomplete report. */
export const isCompleteScore = (rules: ScoreRules, player1Games: number, player2Games: number): boolean => {
  const m = majority(rules.bestOf)
  return player1Games === m || player2Games === m
}

/** More games wins, equal games is a draw. */
export const matchOutcome = (player1Games: number, player2Games: number): Exclude<Outcome, 'bye'> =>
  player1Games > player2Games ? 'p1' : player2Games > player1Games ? 'p2' : 'draw'
