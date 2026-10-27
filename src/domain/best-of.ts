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

/** Games each side won, in side order: [player 1, player 2], or [mine, theirs] when a player reports. */
export type Score = readonly [number, number]

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

/** The most games either side can ever report, across every best-of. */
export const MAX_GAMES = Math.max(...BEST_OF_VALUES.map(majority))

/** Highest value one side's stepper may reach, given the other side's games: both can't be at the majority. */
export const stepperMax = (rules: ScoreRules, otherGames: number): number => {
  const m = majority(rules.bestOf)
  return otherGames >= m ? m - 1 : m
}

const plural = (n: number) => (n === 1 ? `${n} game` : `${n} games`)

/** Why a score can't happen under these rules, or null when it is valid. */
export const invalidScoreReason = (rules: ScoreRules, [a, b]: Score): string | null => {
  const m = majority(rules.bestOf)
  const inRange = (g: number) => Number.isInteger(g) && g >= 0 && g <= m
  if (!inRange(a) || !inRange(b) || (a === m && b === m)) {
    return `A best of ${rules.bestOf} ends at ${plural(m)}`
  }
  if (!rules.allowEqualGames && a === b) return 'This match can’t end in a tie'
  return null
}

export const isValidScore = (rules: ScoreRules, score: Score): boolean => invalidScoreReason(rules, score) === null

/** A side reached the majority. Anything else is an incomplete report. */
export const isCompleteScore = (rules: ScoreRules, [a, b]: Score): boolean => {
  const m = majority(rules.bestOf)
  return a === m || b === m
}

/** More games wins; equal games is a tie (stored as the 'draw' outcome). */
export const matchOutcome = ([player1Games, player2Games]: Score): Exclude<Outcome, 'bye'> =>
  player1Games > player2Games ? 'p1' : player2Games > player1Games ? 'p2' : 'draw'
