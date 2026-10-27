import { describe, expect, it } from '@effect/vitest'
import {
  BEST_OF_VALUES,
  DEFAULT_BEST_OF,
  invalidScoreReason,
  isCompleteScore,
  isValidScore,
  majority,
  matchOutcome,
  MAX_GAMES,
  scoreRules,
  stepperMax,
} from './best-of.ts'

const bo1 = scoreRules(1)
const bo3 = scoreRules(3)
const bo5 = scoreRules(5)
const bo3NoTies = scoreRules(3, { allowEqualGames: false })

describe('best of', () => {
  it('allows 1, 3 or 5 and defaults to 3', () => {
    expect(BEST_OF_VALUES).toEqual([1, 3, 5])
    expect(DEFAULT_BEST_OF).toBe(3)
  })

  it('never has a side report more than 3 games', () => {
    expect(MAX_GAMES).toBe(3)
  })

  it.each([
    [1, 1],
    [3, 2],
    [5, 3],
  ] as const)('a best of %i is won with %i games', (bestOf, games) => {
    expect(majority(bestOf)).toBe(games)
  })

  it('allows equal games unless the rules say otherwise', () => {
    expect(bo3.allowEqualGames).toBe(true)
    expect(bo3NoTies.allowEqualGames).toBe(false)
  })

  describe('stepper bounds', () => {
    it.each([
      [bo1, 0, 1],
      [bo1, 1, 0],
      [bo3, 0, 2],
      [bo3, 1, 2],
      [bo3, 2, 1],
      [bo5, 2, 3],
      [bo5, 3, 2],
    ] as const)('with the other side on %#, a side can go up to the max', (rules, other, max) => {
      expect(stepperMax(rules, other)).toBe(max)
    })
  })

  describe('valid scores', () => {
    it.each([
      [bo1, 1, 0],
      [bo1, 0, 1],
      [bo1, 0, 0],
      [bo3, 2, 1],
      [bo3, 2, 0],
      [bo3, 1, 1],
      [bo3, 1, 0],
      [bo3, 0, 0],
      [bo5, 3, 2],
      [bo5, 2, 2],
      [bo5, 0, 3],
    ] as const)('score %#: %i–%i is valid', (rules, p1, p2) => {
      expect(isValidScore(rules, [p1, p2])).toBe(true)
      expect(invalidScoreReason(rules, [p1, p2])).toBeNull()
    })

    it.each([
      [bo1, 1, 1],
      [bo1, 2, 0],
      [bo3, 2, 2],
      [bo3, 3, 0],
      [bo5, 3, 3],
      [bo5, 4, 1],
      [bo3, -1, 0],
      [bo3, 1.5, 0],
    ] as const)('score %#: %i–%i is invalid', (rules, p1, p2) => {
      expect(isValidScore(rules, [p1, p2])).toBe(false)
    })

    it('explains why a score is impossible', () => {
      expect(invalidScoreReason(bo3, [3, 0])).toBe('A best of 3 ends at 2 games')
      expect(invalidScoreReason(bo3, [2, 2])).toBe('A best of 3 ends at 2 games')
      expect(invalidScoreReason(bo1, [2, 0])).toBe('A best of 1 ends at 1 game')
    })

    it('refuses equal games when the rules refuse ties', () => {
      expect(isValidScore(bo3NoTies, [1, 1])).toBe(false)
      expect(isValidScore(bo3NoTies, [0, 0])).toBe(false)
      expect(invalidScoreReason(bo3NoTies, [1, 1])).toBe('This match can’t end in a tie')
      expect(isValidScore(bo3NoTies, [2, 1])).toBe(true)
    })
  })

  describe('complete scores', () => {
    it.each([
      [bo1, 1, 0, true],
      [bo1, 0, 0, false],
      [bo3, 2, 0, true],
      [bo3, 1, 2, true],
      [bo3, 1, 1, false],
      [bo3, 1, 0, false],
      [bo5, 3, 2, true],
      [bo5, 2, 2, false],
    ] as const)('score %#: %i–%i complete is %s', (rules, p1, p2, complete) => {
      expect(isCompleteScore(rules, [p1, p2])).toBe(complete)
    })
  })

  describe('outcome', () => {
    it.each([
      [2, 1, 'p1'],
      [1, 0, 'p1'],
      [0, 3, 'p2'],
      [1, 1, 'draw'],
      [0, 0, 'draw'],
    ] as const)('%i–%i is %s', (p1, p2, outcome) => {
      expect(matchOutcome([p1, p2])).toBe(outcome)
    })
  })
})
