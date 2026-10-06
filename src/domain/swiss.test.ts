import { describe, expect, it } from '@effect/vitest'
import { Effect, Random } from 'effect'
import type { MatchRecord } from './standings.ts'
import { pairRound, pairWithoutRematches, previousPairings, recommendedRounds } from './swiss.ts'

const players = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`)

describe('recommendedRounds', () => {
  it.each([
    [2, 1],
    [4, 3],
    [8, 3],
    [9, 4],
    [16, 5],
    [32, 5],
    [33, 6],
  ])('%i players → %i rounds', (count, rounds) => {
    expect(recommendedRounds(count)).toBe(rounds)
  })
})

describe('pairWithoutRematches', () => {
  it('backtracks to avoid a rematch', () => {
    const played = previousPairings([{ player1Id: 'a', player2Id: 'b', outcome: 'p1' }])
    const pairs = pairWithoutRematches(['a', 'b', 'c', 'd'], played)
    expect(pairs).toEqual([
      ['a', 'c'],
      ['b', 'd'],
    ])
  })

  it('returns null when every pairing is a rematch', () => {
    const played = previousPairings([{ player1Id: 'a', player2Id: 'b', outcome: 'p1' }])
    expect(pairWithoutRematches(['a', 'b'], played)).toBeNull()
  })
})

describe('pairRound', () => {
  it.effect('pairs everyone exactly once in round one', () =>
    Effect.gen(function* () {
      const ids = players(8)
      const pairings = yield* pairRound({ activePlayerIds: ids, allPlayerIds: ids, matches: [] })
      expect(pairings).toHaveLength(4)
      const seated = pairings.flatMap((p) => [p.player1Id, p.player2Id])
      expect(new Set(seated)).toEqual(new Set(ids))
      expect(pairings.map((p) => p.table)).toEqual([1, 2, 3, 4])
    }),
  )

  it.effect('gives the bye to the lowest-ranked player without a previous bye', () =>
    Effect.gen(function* () {
      const ids = players(5)
      const matches: Array<MatchRecord> = [
        { player1Id: 'p1', player2Id: 'p2', outcome: 'p1' },
        { player1Id: 'p3', player2Id: 'p4', outcome: 'p1' },
        { player1Id: 'p5', player2Id: null, outcome: 'bye' },
      ]
      const pairings = yield* pairRound({ activePlayerIds: ids, allPlayerIds: ids, matches })
      const bye = pairings.find((p) => p.player2Id === null)
      // p5 already had a bye; p2 and p4 are the 0-point players.
      expect(['p2', 'p4']).toContain(bye?.player1Id)
      expect(bye?.table).toBe(3)
    }),
  )

  it.effect('pairs within point brackets and never repeats a pairing', () =>
    Effect.gen(function* () {
      const ids = players(4)
      const matches: Array<MatchRecord> = [
        { player1Id: 'p1', player2Id: 'p2', outcome: 'p1' },
        { player1Id: 'p3', player2Id: 'p4', outcome: 'p1' },
      ]
      const pairings = yield* pairRound({ activePlayerIds: ids, allPlayerIds: ids, matches })
      const asSets = pairings.map((p) => new Set([p.player1Id, p.player2Id]))
      expect(asSets).toContainEqual(new Set(['p1', 'p3']))
      expect(asSets).toContainEqual(new Set(['p2', 'p4']))
    }),
  )

  it.effect('skips dropped players', () =>
    Effect.gen(function* () {
      const all = players(4)
      const pairings = yield* pairRound({ activePlayerIds: ['p1', 'p2', 'p3'], allPlayerIds: all, matches: [] })
      const seated = pairings.flatMap((p) => [p.player1Id, p.player2Id]).filter(Boolean)
      expect(seated).not.toContain('p4')
      expect(pairings.filter((p) => p.player2Id === null)).toHaveLength(1)
    }),
  )

  it.effect('is reproducible for a given seed', () =>
    Effect.gen(function* () {
      const ids = players(10)
      const run = pairRound({ activePlayerIds: ids, allPlayerIds: ids, matches: [] })
      const a = yield* run.pipe(Random.withSeed('league-night'))
      const b = yield* run.pipe(Random.withSeed('league-night'))
      expect(a).toEqual(b)
    }),
  )
})
