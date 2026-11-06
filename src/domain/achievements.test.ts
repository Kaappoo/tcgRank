import { describe, expect, it } from 'vitest'
import {
  ACHIEVEMENTS,
  BADGE_COUNT,
  earnedTiers,
  isBusy,
  isQualifying,
  TITLES,
  titleFor,
  trophiesFor,
  type HistoryEvent,
  type HistoryMatch,
} from './achievements.ts'

const DAY = 86_400_000

const win = (round: number, opponentId = `opp-${round}`, games: [number, number] = [2, 1]): HistoryMatch => ({
  roundNumber: round,
  opponentId,
  result: 'win',
  gamesWon: games[0],
  gamesLost: games[1],
  confirmed: true,
  elimination: false,
})
const loss = (round: number, opponentId = `opp-${round}`): HistoryMatch => ({
  ...win(round, opponentId),
  result: 'loss',
  gamesWon: 1,
  gamesLost: 2,
})
const bye = (round: number): HistoryMatch => ({
  ...win(round),
  opponentId: null,
  result: 'bye',
  gamesWon: 2,
  gamesLost: 0,
})

let n = 0
/** A qualifying event the player finished on day `day`, with the given matches. */
const played = (
  day: number,
  matches: ReadonlyArray<HistoryMatch>,
  overrides: Partial<HistoryEvent> = {},
  entry: Partial<NonNullable<HistoryEvent['entry']>> = {},
): HistoryEvent => ({
  id: `evt-${n++}`,
  status: 'finished',
  finishedAt: day * DAY,
  format: 'standard',
  bestOf: 3,
  playerCount: 8,
  accountCount: 8,
  rounds: Math.max(3, ...matches.map((m) => m.roundNumber)),
  topCut: false,
  hosted: false,
  entry: { droppedAtRound: null, finalRank: 4, deckId: null, matches, ...entry },
  ...overrides,
})
const hosted = (day: number, overrides: Partial<HistoryEvent> = {}): HistoryEvent => ({
  ...played(day, []),
  hosted: true,
  entry: null,
  ...overrides,
})

const tiersOf = (history: ReadonlyArray<HistoryEvent>, achievement: string) =>
  earnedTiers(history)
    .earned.filter((e) => e.achievement === achievement)
    .map((e) => [e.tier, e.earnedAt / DAY])

describe('the catalogue', () => {
  it('has 13 achievements, 36 badges and 9 titles', () => {
    expect(ACHIEVEMENTS).toHaveLength(13)
    expect(ACHIEVEMENTS.filter((a) => a.tiers.length > 1)).toHaveLength(7)
    expect(ACHIEVEMENTS.filter((a) => a.secret).map((a) => a.id)).toEqual(['comeback', 'marathon', 'rival'])
    expect(BADGE_COUNT).toBe(36)
    expect(TITLES.map((t) => t.name)).toEqual([
      'Regular',
      'Local Legend',
      'Veteran',
      'Champion',
      'Dynasty',
      'Organiser',
      'Sweeper',
      'Brewer',
      'Undefeated',
    ])
  })

  it('maps tiers to their titles and trophy items', () => {
    expect(titleFor('regular', 4)).toBe('regular')
    expect(titleFor('regular', 6)).toBe('local-legend')
    expect(titleFor('champion', 1)).toBe('champion')
    expect(titleFor('champion', 2)).toBeNull()
    expect(trophiesFor('champion', 1)).toEqual(['champion-cap', 'champion-slab'])
    expect(trophiesFor('regular', 3)).toEqual(['league-pin'])
  })
})

describe('qualifying events', () => {
  it('needs a finished event with at least 4 players, 2 of them with accounts', () => {
    expect(isQualifying(played(1, []))).toBe(true)
    expect(isQualifying(played(1, [], { playerCount: 3 }))).toBe(false)
    expect(isQualifying(played(1, [], { accountCount: 1 }))).toBe(false)
    expect(isQualifying(played(1, [], { status: 'running', finishedAt: null }))).toBe(false)
  })

  it('earns nothing from events that do not qualify', () => {
    const history = [
      played(1, [win(1)], { playerCount: 3 }, { finalRank: 1 }),
      played(2, [win(1)], { accountCount: 1 }, { finalRank: 1 }),
    ]
    expect(earnedTiers(history).earned).toEqual([])
  })
})

describe('Regular', () => {
  it('counts events played, dated by the event that crossed each threshold', () => {
    const history = Array.from({ length: 10 }, (_, i) => played(10 - i, [win(1)]))
    expect(tiersOf(history, 'regular')).toEqual([
      [1, 1],
      [2, 5],
      [3, 10],
    ])
    expect(earnedTiers(history).progress.regular).toBe(10)
  })

  it('counts a dropped player who played a match, but not one who played none', () => {
    const history = [played(1, [loss(1)], {}, { droppedAtRound: 1 }), played(2, [], {}, { droppedAtRound: 0 })]
    expect(earnedTiers(history).progress.regular).toBe(1)
  })
})

describe('Match winner', () => {
  it('counts confirmed match wins, never byes or unconfirmed reports', () => {
    const history = [played(1, [win(1), bye(2), { ...win(3), confirmed: false }, loss(4)])]
    expect(earnedTiers(history).progress['match-winner']).toBe(1)
    expect(tiersOf(history, 'match-winner')).toEqual([[1, 1]])
  })

  it('reaches 10 wins on the event that holds the tenth', () => {
    const history = [
      played(
        1,
        [1, 2, 3, 4, 5, 6].map((r) => win(r)),
      ),
      played(
        2,
        [1, 2, 3, 4].map((r) => win(r)),
      ),
    ]
    expect(tiersOf(history, 'match-winner')).toEqual([
      [1, 1],
      [2, 2],
    ])
  })
})

describe('Champion, Top cut and placement', () => {
  it('counts events won', () => {
    expect(tiersOf([played(3, [win(1)], {}, { finalRank: 1 })], 'champion')).toEqual([[1, 3]])
  })

  it('gives a dropped player no placement achievements', () => {
    const history = [
      played(
        1,
        [win(1), win(2), win(3), { ...win(4), elimination: true }],
        { topCut: true },
        { finalRank: 1, droppedAtRound: 4 },
      ),
    ]
    const ids = earnedTiers(history).earned.map((e) => e.achievement)
    expect(ids).not.toContain('champion')
    expect(ids).not.toContain('top-cut')
    expect(ids).not.toContain('undefeated')
    expect(ids).toContain('regular')
  })

  it('counts a top cut reached when the player played an elimination round of a Swiss top cut', () => {
    const cut = played(1, [win(1), win(2), loss(3), { ...loss(4), elimination: true }], { topCut: true })
    const missed = played(2, [win(1), loss(2), loss(3)], { topCut: true })
    const elimination = played(3, [{ ...win(1), elimination: true }], { topCut: false })
    expect(earnedTiers([cut, missed, elimination]).progress['top-cut']).toBe(1)
  })
})

describe('Host', () => {
  it('counts qualifying events hosted', () => {
    const history = [...Array.from({ length: 10 }, (_, i) => hosted(i + 1)), hosted(11, { playerCount: 2 })]
    expect(tiersOf(history, 'host')).toEqual([
      [1, 1],
      [2, 10],
    ])
  })
})

describe('Clean sweep', () => {
  it('counts best-of-3 or best-of-5 wins without dropping a game', () => {
    const sweep = (r: number) => win(r, `o${r}`, [2, 0])
    const history = [
      played(1, [sweep(1), sweep(2), sweep(3), win(4)]),
      played(2, [sweep(1), sweep(2)], { bestOf: 1 }),
      played(3, [sweep(1), { ...sweep(2), gamesWon: 3 }], { bestOf: 5 }),
    ]
    expect(earnedTiers(history).progress['clean-sweep']).toBe(5)
    expect(tiersOf(history, 'clean-sweep')).toEqual([[1, 3]])
  })
})

describe('Brewer and Loyal', () => {
  it('Brewer counts different decks registered in events played', () => {
    const history = ['a', 'b', 'a', 'c', 'd', 'e'].map((deckId, i) => played(i + 1, [win(1)], {}, { deckId }))
    expect(earnedTiers(history).progress.brewer).toBe(5)
    expect(tiersOf(history, 'brewer')).toEqual([
      [1, 1],
      [2, 6],
    ])
  })

  it('Loyal needs the same deck registered in 10 events', () => {
    const nine = Array.from({ length: 9 }, (_, i) => played(i + 1, [win(1)], {}, { deckId: 'lugia' }))
    expect(tiersOf(nine, 'loyal')).toEqual([])
    expect(tiersOf([...nine, played(20, [win(1)], {}, { deckId: 'lugia' })], 'loyal')).toEqual([[1, 20]])
  })
})

describe('one-off achievements', () => {
  it('Undefeated: a finished event of 3+ rounds with no match losses', () => {
    expect(tiersOf([played(1, [win(1), win(2), { ...win(3), result: 'draw' }])], 'undefeated')).toEqual([[1, 1]])
    expect(tiersOf([played(1, [win(1), win(2)], { rounds: 2 })], 'undefeated')).toEqual([])
    expect(tiersOf([played(1, [win(1), loss(2), win(3)])], 'undefeated')).toEqual([])
  })

  it('Explorer: all four formats', () => {
    const formats = ['standard', 'expanded', 'glc'].map((format, i) => played(i + 1, [win(1)], { format }))
    expect(tiersOf(formats, 'explorer')).toEqual([])
    expect(tiersOf([...formats, played(9, [win(1)], { format: 'unlimited' })], 'explorer')).toEqual([[1, 9]])
  })

  it('Rival: 10 matches against the same opponent', () => {
    const history = Array.from({ length: 10 }, (_, i) => played(i + 1, [i % 2 ? win(1, 'gary') : loss(1, 'gary')]))
    expect(tiersOf(history.slice(0, 9), 'rival')).toEqual([])
    expect(tiersOf(history, 'rival')).toEqual([[1, 10]])
  })

  it('Comeback: won an event after losing round 1', () => {
    expect(tiersOf([played(1, [loss(1), win(2), win(3)], {}, { finalRank: 1 })], 'comeback')).toEqual([[1, 1]])
    expect(tiersOf([played(1, [win(1), win(2), win(3)], {}, { finalRank: 1 })], 'comeback')).toEqual([])
  })

  it('Marathon: 8 or more rounds in one event', () => {
    const rounds = (k: number) => Array.from({ length: k }, (_, i) => win(i + 1))
    expect(tiersOf([played(1, rounds(7))], 'marathon')).toEqual([])
    expect(tiersOf([played(1, rounds(8))], 'marathon')).toEqual([[1, 1]])
  })
})

describe('isBusy', () => {
  it('is busy while entered and not dropped in a running event, or hosting one', () => {
    expect(isBusy({ entries: [{ status: 'running', dropped: false }], hosted: [] })).toBe(true)
    expect(isBusy({ entries: [{ status: 'running', dropped: true }], hosted: [] })).toBe(false)
    expect(isBusy({ entries: [{ status: 'finished', dropped: false }], hosted: [] })).toBe(false)
    expect(isBusy({ entries: [{ status: 'registration', dropped: false }], hosted: [] })).toBe(false)
    expect(isBusy({ entries: [], hosted: [{ status: 'running' }] })).toBe(true)
    expect(isBusy({ entries: [], hosted: [{ status: 'finished' }] })).toBe(false)
  })
})
