import { Effect, Random } from 'effect'
import { computeStandings, type MatchRecord } from './standings.ts'

/** One table of a round. Byes come last, with no player 2. */
export interface Pairing {
  readonly table: number
  readonly player1Id: string
  /** `null` means player 1 receives a bye. */
  readonly player2Id: string | null
}

/** Upper bound of attendance for each round count, from 3 rounds up; above the last row, 10 rounds. */
const LEAGUE_CHALLENGE_ROWS = [8, 16, 32, 64, 128, 256, 512] as const
const LEAGUE_CUP_ROWS = [8, 12, 32, 64, 128, 226, 409] as const

/**
 * Recommended number of Swiss rounds, following the Play! Pokémon attendance
 * tables: League Challenge for an event without a top cut, League Cup for one
 * with a cut. Below 4 players: 1 round for 2, 3 for 3.
 */
export const recommendedRounds = (playerCount: number, options: { readonly topCut: boolean }): number => {
  if (playerCount <= 2) return 1
  const rows = options.topCut ? LEAGUE_CUP_ROWS : LEAGUE_CHALLENGE_ROWS
  const row = rows.findIndex((max) => playerCount <= max)
  return row === -1 ? 3 + rows.length : 3 + row
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

/** Collects every pairing that already happened so we can avoid rematches. */
export const previousPairings = (matches: ReadonlyArray<MatchRecord>): Set<string> => {
  const seen = new Set<string>()
  for (const m of matches) if (m.player2Id) seen.add(pairKey(m.player1Id, m.player2Id))
  return seen
}

/**
 * Pairs an ordered list (best first) with depth-first backtracking so that no
 * two players meet twice. Returns `null` when no rematch-free pairing exists.
 */
export const pairWithoutRematches = (
  ordered: ReadonlyArray<string>,
  played: ReadonlySet<string>,
  budget = { steps: 100_000 },
): Array<[string, string]> | null => {
  if (ordered.length === 0) return []
  const [first, ...rest] = ordered
  if (first === undefined) return []
  for (let i = 0; i < rest.length; i++) {
    if (--budget.steps <= 0) return null
    const candidate = rest[i]
    if (candidate === undefined || played.has(pairKey(first, candidate))) continue
    const remaining = [...rest.slice(0, i), ...rest.slice(i + 1)]
    const tail = pairWithoutRematches(remaining, played, budget)
    if (tail) return [[first, candidate], ...tail]
  }
  return null
}

/** Sequential fallback for tiny fields where rematches are unavoidable. */
const pairSequentially = (ordered: ReadonlyArray<string>): Array<[string, string]> => {
  const pairs: Array<[string, string]> = []
  for (let i = 0; i + 1 < ordered.length; i += 2) pairs.push([ordered[i]!, ordered[i + 1]!])
  return pairs
}

interface PairRoundInput {
  /** Players still active in the event (dropped players excluded). */
  readonly activePlayerIds: ReadonlyArray<string>
  /** Every player that ever entered — needed for tiebreakers of dropped opponents. */
  readonly allPlayerIds: ReadonlyArray<string>
  readonly matches: ReadonlyArray<MatchRecord>
}

/**
 * Builds the pairings for the next Swiss round.
 *
 * Round one is random. Later rounds sort by match points and tiebreakers
 * (with a random shuffle inside each point bracket so equal records do not
 * always meet the same way), give the bye to the lowest-ranked player that
 * has not had one yet, then pair top-down avoiding rematches.
 */
export const pairRound = Effect.fn('pairRound')(function* (input: PairRoundInput) {
  const active = new Set(input.activePlayerIds)
  const isFirstRound = input.matches.length === 0

  let ordered: Array<string>
  if (isFirstRound) {
    ordered = [...(yield* Random.shuffle(input.activePlayerIds))]
  } else {
    const standings = computeStandings(input.allPlayerIds, input.matches).filter((s) => active.has(s.playerId))
    const brackets = new Map<number, Array<string>>()
    for (const s of standings) brackets.set(s.points, [...(brackets.get(s.points) ?? []), s.playerId])
    ordered = []
    for (const points of [...brackets.keys()].sort((a, b) => b - a)) {
      ordered.push(...(yield* Random.shuffle(brackets.get(points) ?? [])))
    }
  }

  let byePlayer: string | null = null
  if (ordered.length % 2 === 1) {
    const hadBye = new Set(input.matches.filter((m) => m.player2Id === null).map((m) => m.player1Id))
    const index = [...ordered].reverse().findIndex((id) => !hadBye.has(id))
    const pick = index === -1 ? ordered.length - 1 : ordered.length - 1 - index
    byePlayer = ordered[pick] ?? null
    ordered.splice(pick, 1)
  }

  const played = previousPairings(input.matches)
  const pairs = pairWithoutRematches(ordered, played) ?? pairSequentially(ordered)

  const pairings: Array<Pairing> = pairs.map(([player1Id, player2Id], i) => ({
    table: i + 1,
    player1Id,
    player2Id,
  }))
  if (byePlayer) pairings.push({ table: pairings.length + 1, player1Id: byePlayer, player2Id: null })
  return pairings
})
