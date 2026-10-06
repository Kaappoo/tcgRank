/**
 * Standings and tiebreakers following Play! Pokémon conventions:
 *
 * - Match points: win = 3, draw = 1, loss = 0. A bye counts as a win.
 * - Win % = wins / matches played, excluding byes, floored at 25%.
 * - OMW% (Opponents' Match Win %) = average Win % of every opponent faced.
 * - OOMW% = average OMW% of every opponent faced.
 */

export const POINTS = { win: 3, draw: 1, loss: 0 } as const
export const MIN_WIN_PERCENTAGE = 0.25

export type Outcome = 'p1' | 'p2' | 'draw' | 'bye'

export interface MatchRecord {
  readonly player1Id: string
  readonly player2Id: string | null
  /** `null` while the match is still being played. */
  readonly outcome: Outcome | null
}

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
}

interface Tally {
  wins: number
  losses: number
  draws: number
  byes: number
  opponents: Array<string>
}

const emptyTally = (): Tally => ({ wins: 0, losses: 0, draws: 0, byes: 0, opponents: [] })

export const matchPoints = (t: Pick<Tally, 'wins' | 'draws' | 'byes'>): number =>
  (t.wins + t.byes) * POINTS.win + t.draws * POINTS.draw

export const winPercentage = (t: Pick<Tally, 'wins' | 'losses' | 'draws'>): number => {
  const played = t.wins + t.losses + t.draws
  if (played === 0) return MIN_WIN_PERCENTAGE
  return Math.max(MIN_WIN_PERCENTAGE, t.wins / played)
}

const average = (values: ReadonlyArray<number>): number =>
  values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length

/** Tallies every reported match. Unreported matches are ignored. */
export const tallyResults = (
  playerIds: ReadonlyArray<string>,
  matches: ReadonlyArray<MatchRecord>,
): Map<string, Tally> => {
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

export const compareStandings = (a: Omit<Standing, 'rank'>, b: Omit<Standing, 'rank'>): number =>
  b.points - a.points ||
  b.opponentWinPercentage - a.opponentWinPercentage ||
  b.opponentOpponentWinPercentage - a.opponentOpponentWinPercentage ||
  a.playerId.localeCompare(b.playerId)

export const computeStandings = (
  playerIds: ReadonlyArray<string>,
  matches: ReadonlyArray<MatchRecord>,
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
    }
  })

  return rows.sort(compareStandings).map((row, index) => ({ ...row, rank: index + 1 }))
}

/** Formats a W-L-T record the way players say it out loud: "3-1-0". */
export const formatRecord = (s: Pick<Standing, 'wins' | 'losses' | 'draws' | 'byes'>): string =>
  `${s.wins + s.byes}-${s.losses}-${s.draws}`

export const formatPercentage = (value: number): string => `${(value * 100).toFixed(1)}%`
