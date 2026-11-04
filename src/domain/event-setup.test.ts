import { describe, expect, it } from 'vitest'
import { allowedCutSizes, defaultCutSize, mainPhaseRounds } from './event-setup.ts'

describe('mainPhaseRounds', () => {
  it.each([
    [8, false, 3],
    [16, false, 4],
    [16, true, 5],
    [21, true, 5],
  ])('Swiss with %i players (top cut %s) follows the round table: %i rounds', (playerCount, topCut, rounds) => {
    expect(mainPhaseRounds({ pairingSystem: 'swiss', topCut, plannedRounds: 0, playerCount })).toBe(rounds)
  })

  it('a round count the host set wins', () => {
    expect(mainPhaseRounds({ pairingSystem: 'swiss', topCut: true, plannedRounds: 2, playerCount: 40 })).toBe(2)
  })

  it.each([
    [2, 1],
    [3, 3],
    [4, 3],
    [7, 7],
    [8, 7],
    [11, 11],
  ])('round robin with %i players: everyone plays everyone in %i rounds', (playerCount, rounds) => {
    expect(mainPhaseRounds({ pairingSystem: 'round_robin', topCut: false, plannedRounds: 0, playerCount })).toBe(rounds)
  })

  it.each([
    [2, 1],
    [3, 2],
    [4, 2],
    [5, 3],
    [8, 3],
    [9, 4],
    [16, 4],
  ])('single elimination with %i players: %i rounds', (playerCount, rounds) => {
    expect(mainPhaseRounds({ pairingSystem: 'single_elimination', topCut: false, plannedRounds: 0, playerCount })).toBe(
      rounds,
    )
  })

  it.each(['round_robin', 'single_elimination'] as const)(
    '%s counts at least one round before anyone joins',
    (pairingSystem) => {
      expect(mainPhaseRounds({ pairingSystem, topCut: false, plannedRounds: 0, playerCount: 0 })).toBe(1)
    },
  )
})

describe('defaultCutSize', () => {
  it.each([
    [2, null],
    [8, null],
    [9, 4],
    [20, 4],
    [21, 8],
    [200, 8],
  ])('%i players → %s', (playerCount, size) => {
    expect(defaultCutSize(playerCount)).toBe(size)
  })
})

describe('allowedCutSizes', () => {
  it.each([
    [1, []],
    [2, [2]],
    [3, [2]],
    [4, [2, 4]],
    [7, [2, 4]],
    [8, [2, 4, 8]],
    [40, [2, 4, 8]],
  ])('%i active players can cut to %j', (activePlayers, sizes) => {
    expect(allowedCutSizes(activePlayers)).toEqual(sizes)
  })
})
