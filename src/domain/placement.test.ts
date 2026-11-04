import { describe, expect, it } from 'vitest'
import { bracketPlacements, placedStandings, standingsMatches, type PlacedMatch } from './placement.ts'
import { computeStandings } from './standings.ts'

const match = (
  roundNumber: number,
  player1Id: string,
  player2Id: string | null,
  outcome: PlacedMatch['outcome'],
  bracketSlot: number | null = null,
): PlacedMatch => ({ roundNumber, player1Id, player2Id, outcome, bracketSlot, confirmedAt: 1 })

const player = (id: string, extra: { seed?: number; finalRank?: number; droppedAtRound?: number } = {}) => ({
  id,
  seed: extra.seed ?? null,
  finalRank: extra.finalRank ?? null,
  droppedAtRound: extra.droppedAtRound ?? null,
})

/** A Swiss round of four, then a top 2 where `b` beats `a`. */
const swissRound = [match(1, 'a', 'b', 'p1'), match(1, 'c', 'd', 'p1')]
const cutFinal = match(2, 'a', 'b', 'p2', 0)
const cutEvent = { pairingSystem: 'swiss' as const, plannedRounds: 1, topCutSize: 2 }

describe('standingsMatches', () => {
  it('counts confirmed matches, leaving out elimination byes and anything unconfirmed', () => {
    const se = { pairingSystem: 'single_elimination' as const, plannedRounds: 2, topCutSize: null }
    const bye = match(1, 'a', null, 'bye', 0)
    const played = match(1, 'b', 'c', 'p1', 1)
    const open = { ...match(2, 'a', 'b', null, 0), confirmedAt: null }
    expect(standingsMatches(se, [bye, played, open])).toEqual([played])
  })

  it('counts only the Swiss rounds once a Swiss event has cut', () => {
    expect(standingsMatches(cutEvent, [...swissRound, cutFinal])).toEqual(swissRound)
  })
})

describe('bracketPlacements', () => {
  it('places a top cut by stage reached, then everyone else in Swiss order', () => {
    const bracket = { firstRound: 2, rounds: 1, topCutSize: 2 }
    const { placements } = bracketPlacements(
      bracket,
      ['a', 'b', 'c', 'd'].map((id) => player(id)),
      [cutFinal],
      ['a', 'c', 'b', 'd'],
    )
    expect([...placements]).toEqual([
      ['b', 1],
      ['a', 2],
      ['c', 3],
      ['d', 4],
    ])
  })

  it('shares a single-elimination placement by the round a player went out in', () => {
    const bracket = { firstRound: 1, rounds: 2 }
    const semis = [match(1, 'a', 'd', 'p1', 0), match(1, 'b', 'c', 'p1', 1)]
    const { placements } = bracketPlacements(
      bracket,
      ['a', 'b', 'c', 'd'].map((id) => player(id)),
      [...semis, match(2, 'a', 'b', 'p1', 0)],
      [],
    )
    expect(Object.fromEntries(placements)).toEqual({ a: 1, b: 2, c: 3, d: 3 })
  })
})

describe('placedStandings', () => {
  const live = computeStandings(['a', 'b', 'c', 'd'], swissRound)

  it('while the cut is played, lists it first by seed with the stage reached', () => {
    const players = [player('a', { seed: 2 }), player('c', { seed: 1 }), player('b'), player('d')]
    const placed = placedStandings({ ...cutEvent, status: 'running' }, live, players, [
      ...swissRound,
      { ...cutFinal, player1Id: 'c', player2Id: 'a', outcome: null },
    ])
    expect(placed.map((s) => [s.playerId, s.stage])).toEqual([
      ['c', 'Final'],
      ['a', 'Final'],
      ['b', null],
      ['d', null],
    ])
  })

  it('once finished, follows the stored placement with the stage each player reached', () => {
    const players = [
      player('a', { seed: 1, finalRank: 2 }),
      player('b', { seed: 2, finalRank: 1 }),
      player('c', { finalRank: 3 }),
      player('d', { finalRank: 4 }),
    ]
    const placed = placedStandings({ ...cutEvent, status: 'finished' }, live, players, [...swissRound, cutFinal])
    expect(placed.map((s) => [s.playerId, s.rank, s.stage])).toEqual([
      ['b', 1, 'Champion'],
      ['a', 2, 'Finalist'],
      ['c', 3, null],
      ['d', 4, null],
    ])
  })
})
