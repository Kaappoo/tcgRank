import { describe, expect, it } from 'vitest'
import {
  bracketExits,
  bracketOf,
  eventBracket,
  firstBracketRound,
  nextBracketRound,
  placementStage,
  roundName,
  sharedPlacements,
  slotOrder,
  stageName,
  topCutLabel,
  topCutPlacements,
  type BracketMatch,
} from './bracket.ts'
import { mainPhaseRounds } from './event-setup.ts'

/** Players named by seed: `s1` is seed 1. */
const seeded = (n: number) => Array.from({ length: n }, (_, i) => `s${i + 1}`)

/** Plays a round where `beats(a, b)` says whether a beats b; byes advance player 1. */
const play = (
  roundNumber: number,
  pairings: ReturnType<typeof firstBracketRound>,
  beats: (a: string, b: string) => boolean = (a, b) => a < b,
): Array<BracketMatch> =>
  pairings.map((p) => ({
    roundNumber,
    slot: p.slot,
    player1Id: p.player1Id,
    player2Id: p.player2Id,
    outcome: p.player2Id === null ? 'bye' : beats(p.player1Id, p.player2Id) ? 'p1' : 'p2',
  }))

/** The round-1 matches in slot order as "a-b" (byes "a-"). */
const slots = (pairings: ReturnType<typeof firstBracketRound>) =>
  [...pairings].sort((a, b) => a.slot - b.slot).map((p) => `${p.player1Id}-${p.player2Id ?? ''}`)

describe('slotOrder', () => {
  it.each([
    [2, [1, 2]],
    [4, [1, 4, 2, 3]],
    [8, [1, 8, 4, 5, 2, 7, 3, 6]],
    [16, [1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]],
  ])('a bracket of %i seats seeds in the standard order', (size, order) => {
    expect(slotOrder(size)).toEqual(order)
  })
})

describe('firstBracketRound', () => {
  it('pairs 8 players 1v8, 4v5 | 2v7, 3v6 in slots 0–3', () => {
    expect(slots(firstBracketRound(seeded(8)))).toEqual(['s1-s8', 's4-s5', 's2-s7', 's3-s6'])
  })

  it.each([
    [5, ['s1', 's2', 's3']],
    [6, ['s1', 's2']],
    [7, ['s1']],
    [3, ['s1']],
    [8, []],
    [2, []],
  ])('with %i players the byes go to the top seeds %j', (n, byes) => {
    const round = firstBracketRound(seeded(n))
    expect(round.filter((p) => p.player2Id === null).map((p) => p.player1Id)).toEqual(byes)
    const seated = round.flatMap((p) => [p.player1Id, ...(p.player2Id ? [p.player2Id] : [])])
    expect([...seated].sort()).toEqual(seeded(n).sort())
  })

  it('keeps each bye in its slot: 5 players give 1-bye, 4v5, 2-bye, 3-bye', () => {
    expect(slots(firstBracketRound(seeded(5)))).toEqual(['s1-', 's4-s5', 's2-', 's3-'])
  })

  it('numbers the tables from 1 for the matches, with byes last', () => {
    const round = firstBracketRound(seeded(6))
    expect(round.map((p) => [p.table, p.player2Id === null])).toEqual([
      [1, false],
      [2, false],
      [3, true],
      [4, true],
    ])
  })
})

describe('nextBracketRound', () => {
  it('pairs the winners of slots 2k and 2k+1 in slot k', () => {
    const quarterfinals = play(1, firstBracketRound(seeded(8)))
    const semifinals = nextBracketRound(quarterfinals)
    expect(slots(semifinals)).toEqual(['s1-s4', 's2-s3'])
    expect(slots(nextBracketRound(play(2, semifinals)))).toEqual(['s1-s2'])
  })

  it('advances byes and upsets alike', () => {
    const upset = (a: string, b: string) => !(a === 's4' && b === 's5') && a < b
    const first = play(1, firstBracketRound(seeded(5)), upset)
    expect(slots(nextBracketRound(first))).toEqual(['s1-s5', 's2-s3'])
  })

  it('gives a bye to the opponent of a player who dropped before the round', () => {
    const first = play(1, firstBracketRound(seeded(8)))
    const next = nextBracketRound(first, new Set(['s4']))
    expect(slots(next)).toEqual(['s1-', 's2-s3'])
    expect(next.map((p) => p.table)).toEqual([1, 2])
  })

  it('leaves a slot empty when both players dropped', () => {
    const first = play(1, firstBracketRound(seeded(8)))
    expect(slots(nextBracketRound(first, new Set(['s1', 's4'])))).toEqual(['s2-s3'])
  })
})

describe('rounds and stage names', () => {
  it.each([
    [2, 1],
    [3, 2],
    [4, 2],
    [5, 3],
    [8, 3],
    [9, 4],
    [16, 4],
    [17, 5],
  ])('%i players play %i rounds', (playerCount, rounds) => {
    expect(bracketOf({ firstRound: 1, playerCount }).rounds).toBe(rounds)
    expect(mainPhaseRounds({ pairingSystem: 'single_elimination', topCut: false, plannedRounds: 0, playerCount })).toBe(
      rounds,
    )
  })

  it.each([
    [2, ['Final']],
    [4, ['Semifinal', 'Final']],
    [8, ['Quarterfinal', 'Semifinal', 'Final']],
    [16, ['Round 1', 'Quarterfinal', 'Semifinal', 'Final']],
    [32, ['Round 1', 'Round 2', 'Quarterfinal', 'Semifinal', 'Final']],
  ])('a bracket of %i names its rounds %j', (playerCount, names) => {
    const bracket = bracketOf({ firstRound: 1, playerCount })
    expect(names.map((_, i) => roundName(bracket, i + 1))).toEqual(names)
  })

  it('names only the late stages; earlier rounds have no stage', () => {
    const bracket = bracketOf({ firstRound: 1, playerCount: 16 })
    expect([1, 2, 3, 4].map((r) => stageName(bracket, r))).toEqual([null, 'Quarterfinal', 'Semifinal', 'Final'])
  })

  it('a bracket after 5 Swiss rounds starts at round 6: a top 8 plays rounds 6–8', () => {
    const cut = bracketOf({ firstRound: 6, playerCount: 8 })
    expect([6, 7, 8].map((r) => roundName(cut, r))).toEqual(['Quarterfinal', 'Semifinal', 'Final'])
    expect(stageName(cut, 5)).toBeNull()
  })
})

describe('eventBracket', () => {
  it('a single-elimination event is a bracket from round 1', () => {
    expect(eventBracket({ pairingSystem: 'single_elimination', plannedRounds: 3, topCutSize: null })).toMatchObject({
      firstRound: 1,
      rounds: 3,
    })
  })

  it('a Swiss event has no bracket until it cuts', () => {
    expect(eventBracket({ pairingSystem: 'swiss', plannedRounds: 5, topCutSize: null })).toBeNull()
  })

  it.each([
    [2, 6, 1],
    [4, 6, 2],
    [8, 6, 3],
  ])('a top %i after 5 Swiss rounds starts at round %i and plays %i rounds', (topCutSize, firstRound, rounds) => {
    expect(eventBracket({ pairingSystem: 'swiss', plannedRounds: 5, topCutSize })).toMatchObject({ firstRound, rounds })
  })

  it('labels a top cut\'s first round "Top N" and no other round', () => {
    const cut = eventBracket({ pairingSystem: 'swiss', plannedRounds: 5, topCutSize: 8 })!
    expect([5, 6, 7, 8].map((r) => topCutLabel(cut, r))).toEqual([null, 'Top 8', null, null])
    expect([6, 7, 8].map((r) => roundName(cut, r))).toEqual(['Quarterfinal', 'Semifinal', 'Final'])
  })

  it('a single-elimination bracket has no "Top N" label', () => {
    const bracket = eventBracket({ pairingSystem: 'single_elimination', plannedRounds: 3, topCutSize: null })!
    expect(topCutLabel(bracket, 1)).toBeNull()
  })
})

describe('placement', () => {
  /** Plays a whole bracket of `n` seeds where the better seed always wins. */
  const playOut = (n: number, dropped: ReadonlySet<string> = new Set()) => {
    const bracket = bracketOf({ firstRound: 1, playerCount: n })
    let round = play(1, firstBracketRound(seeded(n)))
    const all = [...round]
    for (let r = 2; r <= bracket.rounds; r++) {
      round = play(r, nextBracketRound(round, dropped))
      all.push(...round)
    }
    return { bracket, matches: all }
  }

  it('players knocked out in the same round share a placement: 1, 2, 3, 3, 5, 5, 5, 5', () => {
    const { bracket, matches } = playOut(8)
    const placements = sharedPlacements(bracketExits(bracket, matches))
    expect(seeded(8).map((id) => placements.get(id))).toEqual([1, 2, 3, 3, 5, 5, 5, 5])
  })

  it('a round-1 bye earns nothing extra: 5 players place 1, 2, 3, 3, 5', () => {
    const { bracket, matches } = playOut(5)
    const placements = sharedPlacements(bracketExits(bracket, matches))
    expect(seeded(5).map((id) => placements.get(id))).toEqual([1, 2, 3, 3, 5])
  })

  it('a player who dropped before their next match is placed as losing that round', () => {
    // s4 wins the quarterfinal, then drops: s1 gets a bye in the semifinal.
    const { bracket, matches } = playOut(8, new Set(['s4']))
    const exits = bracketExits(bracket, matches, new Set(['s4']))
    expect(exits.get('s4')).toBe(2)
    const placements = sharedPlacements(exits)
    expect(placements.get('s4')).toBe(3)
    expect(placements.get('s1')).toBe(1)
  })

  it('a champion who leaves after the final keeps first place', () => {
    const { bracket, matches } = playOut(4)
    expect(bracketExits(bracket, matches, new Set(['s1'])).get('s1')).toBeNull()
  })

  it.each([
    [null, 'Champion'],
    [3, 'Finalist'],
    [2, 'Semifinal'],
    [1, 'Quarterfinal'],
  ])('knocked out in round %s of an 8-player bracket reads %s', (exit, stage) => {
    expect(placementStage(bracketOf({ firstRound: 1, playerCount: 8 }), exit)).toBe(stage)
  })

  it('knocked out in an early round of a 16-player bracket reads "Round 1"', () => {
    expect(placementStage(bracketOf({ firstRound: 1, playerCount: 16 }), 1)).toBe('Round 1')
  })
})

describe('top cut placement', () => {
  const swissOrder = Array.from({ length: 10 }, (_, i) => `p${i + 1}`)
  const cut = eventBracket({ pairingSystem: 'swiss', plannedRounds: 4, topCutSize: 4 })!
  // Semifinals (round 5): p4 beats p1, p2 beats p3. Final (round 6): p2 beats p4.
  const semis = play(5, firstBracketRound(swissOrder.slice(0, 4)), (a, b) =>
    a === 'p4' || b === 'p4' ? a === 'p4' : a < b,
  )
  const final = play(6, nextBracketRound(semis), (a) => a === 'p2')

  it('orders the cut by stage reached, then Swiss rank; everyone else follows in Swiss order', () => {
    const placements = topCutPlacements(bracketExits(cut, [...semis, ...final]), swissOrder)
    expect([...placements].sort((a, b) => a[1] - b[1]).map(([id]) => id)).toEqual([
      'p2',
      'p4',
      'p1',
      'p3',
      'p5',
      'p6',
      'p7',
      'p8',
      'p9',
      'p10',
    ])
  })

  it('gives every player their own placement', () => {
    const placements = topCutPlacements(bracketExits(cut, [...semis, ...final]), swissOrder)
    expect(new Set(placements.values()).size).toBe(10)
  })
})
