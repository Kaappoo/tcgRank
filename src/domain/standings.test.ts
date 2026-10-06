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
