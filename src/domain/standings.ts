/**
 * Standings and tiebreakers following Play! Pokémon conventions:
 *
 * - Match points: win = 3, draw = 1, loss = 0. A bye counts as a win.
 * - Win % = wins / matches played, excluding byes, floored at 25%.
 * - OMW% (Opponents' Match Win %) = average Win % of every opponent faced.
 * - OOMW% = average OMW% of every opponent faced.
 *
 * Swiss breaks ties on points with OMW% then OOMW%. Round robin uses
 * head-to-head (only for a tie between exactly two players), then game-win %,
 * then OMW%.
 */

const POINTS = { win: 3, draw: 1, loss: 0 } as const
export const MIN_WIN_PERCENTAGE = 0.25

export type Outcome = 'p1' | 'p2' | 'draw' | 'bye'

export interface MatchRecord {
  readonly player1Id: string
  readonly player2Id: string | null
  /** `null` while the match is still being played. */
  readonly outcome: Outcome | null
  /** Games won by each player; game-win % needs them. Missing counts as 0. */
  readonly player1Games?: number | null
  readonly player2Games?: number | null
}

export type Tiebreakers = 'swiss' | 'round_robin'

export interface Standing {
  readonly playerId: string
  readonly rank: number
  readonly points: number
  readonly wins: number
  readonly losses: number
  readonly draws: number
  readonly byes: number
  readonly opponents: ReadonlyArray<string>
  readonly winPercentage: number
  readonly opponentWinPercentage: number
  readonly opponentOpponentWinPercentage: number
  /** Share of games won across played matches (byes left out); 0 before any game. */
  readonly gameWinPercentage: number
  /** Placed above the one other player on the same points by beating them (round robin only). */
  readonly headToHead: boolean
}

interface Tally {
  wins: number
  losses: number
  draws: number
  byes: number
  opponents: Array<string>
  gamesWon: number
  gamesPlayed: number
}

const emptyTally = (): Tally => ({ wins: 0, losses: 0, draws: 0, byes: 0, opponents: [], gamesWon: 0, gamesPlayed: 0 })

const matchPoints = (t: Pick<Tally, 'wins' | 'draws' | 'byes'>): number =>
  (t.wins + t.byes) * POINTS.win + t.draws * POINTS.draw

const winPercentage = (t: Pick<Tally, 'wins' | 'losses' | 'draws'>): number => {
  const played = t.wins + t.losses + t.draws
  if (played === 0) return MIN_WIN_PERCENTAGE
  return Math.max(MIN_WIN_PERCENTAGE, t.wins / played)
}

const average = (values: ReadonlyArray<number>): number =>
  values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length

const countGames = (p1: Tally, p2: Tally, m: MatchRecord) => {
  const games1 = m.player1Games ?? 0
  const games2 = m.player2Games ?? 0
  p1.gamesWon += games1
  p2.gamesWon += games2
  p1.gamesPlayed += games1 + games2
  p2.gamesPlayed += games1 + games2
}

/** Tallies every reported match. Unreported matches are ignored. */
const tallyResults = (playerIds: ReadonlyArray<string>, matches: ReadonlyArray<MatchRecord>): Map<string, Tally> => {
  const tallies = new Map<string, Tally>(playerIds.map((id) => [id, emptyTally()]))
  const get = (id: string) => {
    let t = tallies.get(id)
    if (!t) {
      t = emptyTally()
      tallies.set(id, t)
    }
    return t
  }

  for (const m of matches) {
    if (m.outcome === null) continue
    const p1 = get(m.player1Id)
    if (m.outcome === 'bye' || m.player2Id === null) {
      p1.byes += 1
      continue
    }
    const p2 = get(m.player2Id)
    p1.opponents.push(m.player2Id)
    p2.opponents.push(m.player1Id)
    countGames(p1, p2, m)
    switch (m.outcome) {
      case 'p1':
        p1.wins += 1
        p2.losses += 1
        break
      case 'p2':
        p2.wins += 1
        p1.losses += 1
        break
      case 'draw':
        p1.draws += 1
        p2.draws += 1
        break
    }
  }
  return tallies
}

type Row = Omit<Standing, 'rank'>

const compareSwiss = (a: Row, b: Row): number =>
  b.points - a.points ||
  b.opponentWinPercentage - a.opponentWinPercentage ||
  b.opponentOpponentWinPercentage - a.opponentOpponentWinPercentage ||
  a.playerId.localeCompare(b.playerId)

const compareRoundRobin = (a: Row, b: Row): number =>
  b.points - a.points ||
  b.gameWinPercentage - a.gameWinPercentage ||
  b.opponentWinPercentage - a.opponentWinPercentage ||
  a.playerId.localeCompare(b.playerId)

/** Who won the match between `a` and `b`, or null when they drew or have not met. */
const headToHeadWinner = (a: string, b: string, matches: ReadonlyArray<MatchRecord>): string | null => {
  for (const m of matches) {
    const between = (m.player1Id === a && m.player2Id === b) || (m.player1Id === b && m.player2Id === a)
    if (!between) continue
    if (m.outcome === 'p1') return m.player1Id
    if (m.outcome === 'p2') return m.player2Id
  }
  return null
}

/** Rows already sorted by points, grouped into runs on the same points. */
const groupByPoints = (sorted: ReadonlyArray<Row>): Array<Array<Row>> => {
  const groups = new Map<number, Array<Row>>()
  for (const row of sorted) groups.set(row.points, [...(groups.get(row.points) ?? []), row])
  return [...groups.values()]
}

/** Head-to-head only settles a tie between exactly two players, and only when their match had a winner. */
const settleHeadToHead = (tied: Array<Row>, matches: ReadonlyArray<MatchRecord>): Array<Row> => {
  const [first, second] = tied
  if (tied.length !== 2 || !first || !second) return tied
  const winner = headToHeadWinner(first.playerId, second.playerId, matches)
  if (winner === null) return tied
  return winner === first.playerId ? [{ ...first, headToHead: true }, second] : [{ ...second, headToHead: true }, first]
}

const orderRoundRobin = (rows: ReadonlyArray<Row>, matches: ReadonlyArray<MatchRecord>): Array<Row> =>
  groupByPoints([...rows].sort(compareRoundRobin)).flatMap((tied) => settleHeadToHead(tied, matches))

export const computeStandings = (
  playerIds: ReadonlyArray<string>,
  matches: ReadonlyArray<MatchRecord>,
  options: { readonly tiebreakers?: Tiebreakers } = {},
): ReadonlyArray<Standing> => {
  const tallies = tallyResults(playerIds, matches)

  const wp = new Map<string, number>()
  for (const [id, t] of tallies) wp.set(id, winPercentage(t))

  const omw = new Map<string, number>()
  for (const [id, t] of tallies) omw.set(id, average(t.opponents.map((o) => wp.get(o) ?? MIN_WIN_PERCENTAGE)))

  const rows = playerIds.map((playerId) => {
    const t = tallies.get(playerId) ?? emptyTally()
    return {
      playerId,
      points: matchPoints(t),
      wins: t.wins,
      losses: t.losses,
      draws: t.draws,
      byes: t.byes,
      opponents: t.opponents,
      winPercentage: wp.get(playerId) ?? MIN_WIN_PERCENTAGE,
      opponentWinPercentage: omw.get(playerId) ?? 0,
      opponentOpponentWinPercentage: average(t.opponents.map((o) => omw.get(o) ?? 0)),
      gameWinPercentage: t.gamesPlayed === 0 ? 0 : t.gamesWon / t.gamesPlayed,
      headToHead: false,
    }
  })

  const ordered = options.tiebreakers === 'round_robin' ? orderRoundRobin(rows, matches) : rows.sort(compareSwiss)
  return ordered.map((row, index) => ({ ...row, rank: index + 1 }))
}

/** Formats a W-L-T record the way players say it out loud: "3-1-0". */
export const formatRecord = (s: Pick<Standing, 'wins' | 'losses' | 'draws' | 'byes'>): string =>
  `${s.wins + s.byes}-${s.losses}-${s.draws}`

export const formatPercentage = (value: number): string => `${(value * 100).toFixed(1)}%`
