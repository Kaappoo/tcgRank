import { describe, expect, it } from 'vitest'
import { mainPhaseRounds } from './event-setup.ts'
import { scheduleRound } from './round-robin.ts'

const players = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`)

const roundsFor = (playerCount: number) =>
  mainPhaseRounds({ pairingSystem: 'round_robin', topCut: false, plannedRounds: 0, playerCount })

/** Plays the whole schedule of `n` players with nobody dropping. */
const fullSchedule = (n: number) => {
  const schedule = players(n)
  return Array.from({ length: roundsFor(n) }, (_, i) => scheduleRound({ schedule, round: i + 1 }))
}

const pairKey = (a: string, b: string) => [a, b].sort().join('|')

describe('scheduleRound', () => {
  it.each([
    [2, 1],
    [3, 3],
    [4, 3],
    [5, 5],
    [6, 5],
    [7, 7],
    [8, 7],
    [9, 9],
    [12, 11],
  ])('%i players meet each other exactly once over %i rounds', (n, rounds) => {
    const schedule = fullSchedule(n)
    expect(schedule).toHaveLength(rounds)
    const met = schedule.flat().flatMap((p) => (p.player2Id ? [pairKey(p.player1Id, p.player2Id)] : []))
    expect(met).toHaveLength((n * (n - 1)) / 2)
    expect(new Set(met).size).toBe(met.length)
  })

  it.each([2, 3, 4, 5, 7, 8])('every one of %i players plays exactly once in each round', (n) => {
    for (const round of fullSchedule(n)) {
      const seated = round.flatMap((p) => [p.player1Id, ...(p.player2Id ? [p.player2Id] : [])])
      expect([...seated].sort()).toEqual(players(n).sort())
    }
  })

  it.each([3, 5, 7, 9])('in an odd field of %i, each player gets exactly one bye', (n) => {
    const byes = fullSchedule(n)
      .flat()
      .filter((p) => p.player2Id === null)
      .map((p) => p.player1Id)
    expect([...byes].sort()).toEqual(players(n).sort())
  })

  it('an even field has no byes', () => {
    expect(
      fullSchedule(6)
        .flat()
        .some((p) => p.player2Id === null),
    ).toBe(false)
  })

  it('numbers the tables from 1 and puts byes last', () => {
    const round = scheduleRound({ schedule: players(5), round: 2 })
    expect(round.map((p) => p.table)).toEqual([1, 2, 3])
    expect(round.at(-1)?.player2Id).toBeNull()
  })

  it("turns a dropped player's remaining matches into byes for their opponents", () => {
    const schedule = players(6)
    const dropped = new Set(['p3'])
    for (let round = 2; round <= roundsFor(6); round++) {
      const pairings = scheduleRound({ schedule, round, dropped })
      const planned = scheduleRound({ schedule, round })
      const opponent = planned
        .map((p) => (p.player1Id === 'p3' ? p.player2Id : p.player2Id === 'p3' ? p.player1Id : null))
        .find((id) => id !== null)
      expect(pairings.flatMap((p) => [p.player1Id, p.player2Id])).not.toContain('p3')
      expect(pairings).toContainEqual(expect.objectContaining({ player1Id: opponent, player2Id: null }))
      expect(pairings.filter((p) => p.player2Id !== null)).toHaveLength(2)
    }
  })

  it('leaves out a match between two dropped players, and a dropped player due a bye', () => {
    const both = scheduleRound({ schedule: players(4), round: 1, dropped: new Set(['p1', 'p4']) })
    expect(both.flatMap((p) => [p.player1Id, p.player2Id])).not.toContain('p1')
    expect(both.flatMap((p) => [p.player1Id, p.player2Id])).not.toContain('p4')

    const odd = players(5)
    const byeTaker = scheduleRound({ schedule: odd, round: 1 }).find((p) => p.player2Id === null)!.player1Id
    const withDrop = scheduleRound({ schedule: odd, round: 1, dropped: new Set([byeTaker]) })
    expect(withDrop.every((p) => p.player2Id !== null)).toBe(true)
    expect(withDrop).toHaveLength(2)
  })
})
