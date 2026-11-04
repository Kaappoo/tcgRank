/**
 * Single-elimination bracket rules, shared by single-elimination events and the
 * Swiss top cut: the standard slot order, byes to the top seeds, pairing each
 * round from the winners of the last, stage names and shared placement. A
 * bracket may start at any round number (a top cut follows the Swiss rounds).
 * Pure, no IO.
 */
import type { PairingSystem } from './event-setup.ts'
import type { Outcome } from './standings.ts'
import type { Pairing } from './swiss.ts'

/** Where a bracket sits in an event: its first round number and how many rounds it plays. */
export interface Bracket {
  readonly firstRound: number
  readonly rounds: number
  /** The cut size when the bracket is a Swiss event's top cut. */
  readonly topCutSize?: number
}

/** Rounds of a bracket for `playerCount` players: ceil(log2 N), at least 1. */
export const bracketRounds = (playerCount: number): number => Math.ceil(Math.log2(Math.max(2, playerCount)))

export const bracketOf = ({ firstRound, playerCount }: { firstRound: number; playerCount: number }): Bracket => ({
  firstRound,
  rounds: bracketRounds(playerCount),
})

/**
 * The bracket an event plays, once its rounds are fixed: a single-elimination
 * event is a bracket from round 1; a Swiss event that has cut plays its top cut
 * from the round after the Swiss rounds. Null for events without one.
 */
export const eventBracket = (event: {
  readonly pairingSystem: PairingSystem
  readonly plannedRounds: number
  readonly topCutSize: number | null
}): Bracket | null => {
  if (event.pairingSystem === 'swiss' && event.topCutSize !== null) {
    return {
      firstRound: event.plannedRounds + 1,
      rounds: bracketRounds(event.topCutSize),
      topCutSize: event.topCutSize,
    }
  }
  return event.pairingSystem === 'single_elimination' && event.plannedRounds > 0
    ? { firstRound: 1, rounds: event.plannedRounds }
    : null
}

export const finalRound = (bracket: Bracket): number => bracket.firstRound + bracket.rounds - 1

/**
 * Seeds in slot order for a bracket of `size` seats (a power of two): seats 2k
 * and 2k+1 meet in slot k. For 8: 1v8, 4v5 | 2v7, 3v6, so seeds 1 and 2 can
 * only meet in the final.
 */
export const slotOrder = (size: number): Array<number> => {
  let order = [1]
  while (order.length < size) {
    const seats = order.length * 2
    order = order.flatMap((seed) => [seed, seats + 1 - seed])
  }
  return order
}

/** A table of an elimination round, with its place in the bracket. */
export interface BracketPairing extends Pairing {
  /** Winners of slots 2k and 2k+1 meet in slot k of the next round. */
  readonly slot: number
  /** Set when one player dropped before a top cut round: the other wins this match by walkover. */
  readonly walkover?: 'p1' | 'p2'
}

interface Seat {
  readonly slot: number
  readonly a: string
  readonly b: string | null
  readonly walkover?: 'p1' | 'p2'
}

/** Matches get tables 1, 2… in slot order; byes come after them. */
const numberTables = (seats: ReadonlyArray<Seat>): Array<BracketPairing> => {
  const matches = seats.filter((s) => s.b !== null)
  const byes = seats.filter((s) => s.b === null)
  return [...matches, ...byes].map((s, i) => ({
    table: i + 1,
    slot: s.slot,
    player1Id: s.a,
    player2Id: s.b,
    ...(s.walkover ? { walkover: s.walkover } : {}),
  }))
}

/**
 * Round 1 of a bracket from players in seed order (seed 1 first). When the
 * field isn't a power of two, the top seeds get byes: the next power of two
 * minus attendance of them.
 */
export const firstBracketRound = (seeded: ReadonlyArray<string>): Array<BracketPairing> => {
  const order = slotOrder(2 ** bracketRounds(seeded.length))
  const seats = []
  for (let slot = 0; slot < order.length / 2; slot++) {
    const a = seeded[order[2 * slot]! - 1]
    const b = seeded[order[2 * slot + 1]! - 1] ?? null
    if (a !== undefined) seats.push({ slot, a, b })
  }
  return numberTables(seats)
}

/** An elimination match as stored: its round, slot, players and result. */
export interface BracketMatch {
  readonly roundNumber: number
  readonly slot: number
  readonly player1Id: string
  readonly player2Id: string | null
  readonly outcome: Outcome | null
}

const winnerOf = (m: Pick<BracketMatch, 'player1Id' | 'player2Id' | 'outcome'>): string | null =>
  m.outcome === 'p1' || m.outcome === 'bye' ? m.player1Id : m.outcome === 'p2' ? m.player2Id : null

/**
 * The next round from the previous round's matches: the winners of slots 2k
 * and 2k+1 meet in slot k. A winner who dropped before this round gives their
 * opponent a bye (`onDrop: 'bye'`, single elimination), or is paired and loses
 * by walkover (`onDrop: 'walkover'`, a top cut, which never has byes). If both
 * dropped, the slot stays empty.
 */
export const nextBracketRound = (
  previous: ReadonlyArray<Pick<BracketMatch, 'slot' | 'player1Id' | 'player2Id' | 'outcome'>>,
  dropped: ReadonlySet<string> = new Set(),
  { onDrop = 'bye' }: { readonly onDrop?: 'bye' | 'walkover' } = {},
): Array<BracketPairing> => {
  const winners = new Map<number, string>()
  for (const m of previous) {
    const winner = winnerOf(m)
    if (winner !== null && (onDrop === 'walkover' || !dropped.has(winner))) winners.set(m.slot, winner)
  }
  const slotCount = Math.ceil((Math.max(-1, ...previous.map((m) => m.slot)) + 1) / 2)
  const seats: Array<Seat> = []
  for (let slot = 0; slot < slotCount; slot++) {
    const a = winners.get(2 * slot) ?? null
    const b = winners.get(2 * slot + 1) ?? null
    if (a === null || b === null) {
      const lone = a ?? b
      if (lone !== null) seats.push({ slot, a: lone, b: null })
      continue
    }
    const [outA, outB] = [dropped.has(a), dropped.has(b)]
    if (outA && outB) continue
    seats.push({ slot, a, b, ...(outA ? { walkover: 'p2' as const } : outB ? { walkover: 'p1' as const } : {}) })
  }
  return numberTables(seats)
}

export type Stage = 'Final' | 'Semifinal' | 'Quarterfinal'
/** What a bracket round is called: its stage, or "Round N" counted within the bracket before the stages. */
type RoundName = Stage | `Round ${number}`
/** How far a player got in a bracket: "Champion", "Finalist", or the round they went out in (or are in). */
export type PlacementStage = 'Champion' | 'Finalist' | RoundName
const STAGES: ReadonlyArray<Stage> = ['Final', 'Semifinal', 'Quarterfinal']

/** The stage a round of the bracket is, or null for earlier rounds (and rounds outside it). */
export const stageName = (bracket: Bracket, roundNumber: number): Stage | null => {
  const last = finalRound(bracket)
  if (roundNumber < bracket.firstRound || roundNumber > last) return null
  return STAGES[last - roundNumber] ?? null
}

/** What a round of the bracket is called: its stage, or "Round N" (counted within the bracket) before that. */
export const roundName = (bracket: Bracket, roundNumber: number): RoundName =>
  stageName(bracket, roundNumber) ?? `Round ${roundNumber - bracket.firstRound + 1}`

/** "Top 8" on a top cut's first round, where a label names the cut; null for every other round. */
export const topCutLabel = (bracket: Bracket, roundNumber: number): string | null =>
  bracket.topCutSize !== undefined && roundNumber === bracket.firstRound ? `Top ${bracket.topCutSize}` : null

/** A round's full title where a line names it: "Top 8 · Quarterfinal" for a top cut's first round, else its name. */
export const roundTitle = (bracket: Bracket, roundNumber: number): string => {
  const cut = topCutLabel(bracket, roundNumber)
  return cut ? `${cut} · ${roundName(bracket, roundNumber)}` : roundName(bracket, roundNumber)
}

/**
 * The round each player was knocked out in, or null for the champion (and
 * anyone still in). A player who lost a match is out in that round; one who
 * dropped between rounds is out in the round after the last one they played.
 */
type ExitMatch = Pick<BracketMatch, 'roundNumber' | 'player1Id' | 'player2Id' | 'outcome'>

/** The player who lost a played match, or null for a bye or a match without a result. */
const loserOf = (m: ExitMatch): string | null => {
  const winner = winnerOf(m)
  if (winner === null || m.player2Id === null) return null
  return winner === m.player1Id ? m.player2Id : m.player1Id
}

/**
 * Whether a decided elimination match was lost by a drop: its loser had dropped by the match's round (during it, or
 * before it as a walkover) and the winner hadn't reached `gamesToWin`. Read from the drop round, so a host correction
 * keeps it; a match played out to a result before its loser left stands as played.
 */
export const lostByDrop = (
  m: ExitMatch & { readonly player1Games: number; readonly player2Games: number },
  droppedAtRound: (playerId: string) => number | null,
  gamesToWin: number,
): boolean => {
  const loser = loserOf(m)
  const dropRound = loser === null ? null : droppedAtRound(loser)
  const winnerGames = loser === m.player1Id ? m.player2Games : m.player1Games
  return dropRound !== null && dropRound <= m.roundNumber && winnerGames < gamesToWin
}

export const bracketExits = (
  bracket: Bracket,
  matches: ReadonlyArray<ExitMatch>,
  dropped: ReadonlySet<string> = new Set(),
): Map<string, number | null> => {
  const lastPlayed = new Map<string, number>()
  const lost = new Map<string, number>()
  for (const m of matches) {
    const seated = m.player2Id === null ? [m.player1Id] : [m.player1Id, m.player2Id]
    for (const id of seated) lastPlayed.set(id, Math.max(lastPlayed.get(id) ?? 0, m.roundNumber))
    const loser = loserOf(m)
    if (loser !== null) lost.set(loser, m.roundNumber)
  }
  // A drop between rounds goes out in the next round; nobody goes out after the final.
  const missedNext = (id: string, round: number) => (dropped.has(id) && round < finalRound(bracket) ? round + 1 : null)
  return new Map([...lastPlayed].map(([id, round]) => [id, lost.get(id) ?? missedNext(id, round)]))
}

/**
 * How far each player has got in a bracket still being played: the stage they went out in, or the round they are
 * in (or last won) while still in.
 */
export const stagesSoFar = (
  bracket: Bracket,
  matches: ReadonlyArray<ExitMatch>,
  dropped: ReadonlySet<string> = new Set(),
): Map<string, PlacementStage> => {
  const lastSeated = new Map<string, number>()
  for (const m of matches) {
    for (const id of m.player2Id === null ? [m.player1Id] : [m.player1Id, m.player2Id]) {
      lastSeated.set(id, Math.max(lastSeated.get(id) ?? 0, m.roundNumber))
    }
  }
  return new Map(
    [...bracketExits(bracket, matches, dropped)].map(([id, exit]) => [
      id,
      exit === null ? roundName(bracket, lastSeated.get(id)!) : placementStage(bracket, exit),
    ]),
  )
}

/**
 * Single-elimination placement: players knocked out in the same round share
 * it (1, 2, 3, 3, 5…). A player's placement is one more than the number of
 * players who got further.
 */
export const sharedPlacements = (exits: ReadonlyMap<string, number | null>): Map<string, number> => {
  const reach = (exit: number | null) => exit ?? Number.POSITIVE_INFINITY
  const all = [...exits.values()].map(reach)
  return new Map([...exits].map(([id, exit]) => [id, 1 + all.filter((r) => r > reach(exit)).length]))
}

/**
 * Top cut placement: players in the cut by the stage they reached (deeper
 * first), then by Swiss rank among those knocked out in the same round; then
 * everyone else in Swiss order. Every player gets their own placement.
 */
export const topCutPlacements = (
  exits: ReadonlyMap<string, number | null>,
  swissOrder: ReadonlyArray<string>,
): Map<string, number> => {
  // The champion reaches furthest; players outside the cut reach nothing.
  const reach = (id: string) => (exits.has(id) ? (exits.get(id) ?? Number.MAX_SAFE_INTEGER) : -1)
  const swissRank = new Map(swissOrder.map((id, i) => [id, i]))
  const order = [...swissOrder].sort((a, b) => reach(b) - reach(a) || swissRank.get(a)! - swissRank.get(b)!)
  return new Map(order.map((id, i) => [id, i + 1]))
}

/** How far a player got, for the podium: "Champion", "Finalist", or the stage they went out in. */
export const placementStage = (bracket: Bracket, exit: number | null): PlacementStage => {
  if (exit === null) return 'Champion'
  if (exit === finalRound(bracket)) return 'Finalist'
  return roundName(bracket, exit)
}
