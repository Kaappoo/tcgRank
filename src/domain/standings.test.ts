import { describe, expect, it } from '@effect/vitest'
import { computeStandings, formatRecord, MIN_WIN_PERCENTAGE, type MatchRecord } from './standings.ts'

const m = (player1Id: string, player2Id: string | null, outcome: MatchRecord['outcome']): MatchRecord => ({
  player1Id,
  player2Id,
  outcome,
})

describe('computeStandings', () => {
  it('awards 3 points for a win, 1 for a draw and 3 for a bye', () => {
    const standings = computeStandings(['ash', 'misty', 'brock'], [m('ash', 'misty', 'draw'), m('brock', null, 'bye')])
    const byId = Object.fromEntries(standings.map((s) => [s.playerId, s]))
    expect(byId.brock?.points).toBe(3)
    expect(byId.ash?.points).toBe(1)
    expect(byId.misty?.points).toBe(1)
    expect(standings[0]?.playerId).toBe('brock')
  })

  it('ignores matches that are still being played', () => {
    const standings = computeStandings(['ash', 'misty'], [m('ash', 'misty', null)])
    expect(standings.every((s) => s.points === 0 && s.opponents.length === 0)).toBe(true)
  })

  it('floors win percentage at 25% and excludes byes from it', () => {
    const standings = computeStandings(
      ['ash', 'misty', 'brock'],
      [m('ash', 'misty', 'p1'), m('brock', null, 'bye'), m('ash', 'brock', 'p1')],
    )
    const brock = standings.find((s) => s.playerId === 'brock')!
    expect(brock.winPercentage).toBe(MIN_WIN_PERCENTAGE)
    expect(brock.byes).toBe(1)
    expect(formatRecord(brock)).toBe('1-1-0')
  })

  it('breaks ties on points with opponent win percentage', () => {
    // ash and gary both go 1-1, but ash lost to the undefeated player.
    const standings = computeStandings(
      ['ash', 'gary', 'misty', 'brock'],
      [m('misty', 'ash', 'p1'), m('gary', 'brock', 'p1'), m('ash', 'brock', 'p1'), m('misty', 'gary', 'p1')],
    )
    expect(standings.map((s) => s.playerId)).toEqual(['misty', 'ash', 'gary', 'brock'])
    const ash = standings[1]!
    const gary = standings[2]!
    expect(ash.points).toBe(gary.points)
    expect(ash.opponentWinPercentage).toBeGreaterThanOrEqual(gary.opponentWinPercentage)
  })

  it('assigns contiguous ranks starting at 1', () => {
    const standings = computeStandings(['a', 'b', 'c'], [])
    expect(standings.map((s) => s.rank)).toEqual([1, 2, 3])
  })
})

describe('round-robin standings', () => {
  const g = (player1Id: string, player2Id: string | null, player1Games: number, player2Games: number): MatchRecord => ({
    player1Id,
    player2Id,
    outcome:
      player2Id === null ? 'bye' : player1Games > player2Games ? 'p1' : player1Games < player2Games ? 'p2' : 'draw',
    player1Games,
    player2Games,
  })
  const roundRobin = (playerIds: ReadonlyArray<string>, matches: ReadonlyArray<MatchRecord>) =>
    computeStandings(playerIds, matches, { tiebreakers: 'round_robin' })

  it('game-win % is the share of games won, byes left out', () => {
    const [ash] = roundRobin(
      ['ash', 'misty', 'brock'],
      [g('ash', 'misty', 2, 1), g('brock', 'ash', 2, 0), g('ash', null, 2, 0)],
    ).filter((s) => s.playerId === 'ash')
    expect(ash?.gameWinPercentage).toBeCloseTo(2 / 5)
    expect(ash?.points).toBe(6)
  })

  it('head-to-head breaks a tie between exactly two players, ahead of game-win %', () => {
    // a and b on 6 points: b has the better game-win %, but a beat b.
    // c and d on 3 points: c has the better game-win %, but d beat c.
    const standings = roundRobin(
      ['a', 'b', 'c', 'd'],
      [
        g('a', 'b', 2, 1),
        g('a', 'd', 2, 1),
        g('c', 'a', 2, 0),
        g('b', 'c', 2, 0),
        g('b', 'd', 2, 0),
        g('d', 'c', 2, 1),
      ],
    )
    expect(standings.map((s) => s.playerId)).toEqual(['a', 'b', 'd', 'c'])
    expect(standings.map((s) => s.headToHead)).toEqual([true, false, true, false])
  })

  it('a tie between three players skips head-to-head: game-win %, then OMW%', () => {
    // A rock-paper-scissors loop: everyone 1-1. Game-win % decides: a 3/5, c 3/6, b 2/5.
    const standings = roundRobin(['a', 'b', 'c'], [g('a', 'b', 2, 0), g('b', 'c', 2, 1), g('c', 'a', 2, 1)])
    expect(standings.map((s) => s.playerId)).toEqual(['a', 'c', 'b'])
    expect(standings.some((s) => s.headToHead)).toBe(false)
  })

  it('falls through to game-win % when the two tied players drew or have not met', () => {
    const drew = roundRobin(['a', 'b'], [g('a', 'b', 1, 1)])
    expect(drew.some((s) => s.headToHead)).toBe(false)
    const notMet = roundRobin(['a', 'b', 'c', 'd'], [g('a', 'c', 2, 1), g('b', 'd', 2, 0)])
    expect(notMet.map((s) => s.playerId).slice(0, 2)).toEqual(['b', 'a'])
    expect(notMet.some((s) => s.headToHead)).toBe(false)
  })

  it('a bye scores like a Swiss bye: 3 points, a win, left out of OMW%', () => {
    const standings = roundRobin(['a', 'b', 'c'], [g('a', null, 2, 0), g('b', 'c', 2, 0)])
    const a = standings.find((s) => s.playerId === 'a')!
    expect(a.points).toBe(3)
    expect(formatRecord(a)).toBe('1-0-0')
    expect(a.opponents).toEqual([])
  })

  it('Swiss standings never use head-to-head', () => {
    const swiss = computeStandings(['a', 'b'], [g('a', 'b', 2, 1)])
    expect(swiss.some((s) => s.headToHead)).toBe(false)
  })
})
