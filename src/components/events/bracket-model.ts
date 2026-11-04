import { bracketRounds, roundName, type Bracket } from '#/domain/bracket.ts'
import type { EventDetail, MatchView, PlayerRef } from '#/server/events/views.ts'

/** A player in a bracket box: their seed, or null for a seat not yet decided. */
export interface BracketSeat {
  readonly id: string
  readonly name: string
  readonly seed: number | null
}

export type BracketMatchStatus = 'final' | 'confirming' | 'playing' | 'waiting' | 'bye' | 'dropped'

/** One slot of a bracket round: a stored match, or the pairing still to come from the round before. */
export interface BracketBox {
  readonly slot: number
  /** The stored match; null for a slot of a round not paired yet. */
  readonly match: MatchView | null
  readonly table: number | null
  readonly a: BracketSeat | null
  readonly b: BracketSeat | null
  /** For a seat still to be decided, the table whose winner takes it (null if that isn't paired either). */
  readonly feeds: { readonly a: number | null; readonly b: number | null }
  readonly games: readonly [number, number] | null
  readonly winner: 'a' | 'b' | null
  readonly status: BracketMatchStatus
}

export interface BracketRoundModel {
  readonly number: number
  /** "Quarterfinal", "Semifinal", "Final", or "Round N" counted within the bracket. */
  readonly name: string
  readonly paired: boolean
  /** One box per slot, in slot order. */
  readonly boxes: ReadonlyArray<BracketBox>
}

export interface BracketModel {
  readonly bracket: Bracket
  /** Every round of the bracket, paired or not, first round first. */
  readonly rounds: ReadonlyArray<BracketRoundModel>
  /** The latest paired round of the bracket. */
  readonly current: number
}

type BracketSource = Pick<EventDetail, 'rounds' | 'matches' | 'players'>

/**
 * Where the bracket sits, read from the elimination rounds already paired:
 * it starts at the first of them, and that round's slots give its size. This
 * holds for a single-elimination event and for the top cut after Swiss rounds.
 */
const bracketFrom = ({ rounds, matches }: BracketSource): Bracket | null => {
  const first = rounds
    .filter((r) => r.elimination)
    .reduce<number | null>((n, r) => Math.min(n ?? r.number, r.number), null)
  if (first === null) return null
  const slots = Math.max(0, ...matches.filter((m) => m.roundNumber === first).map((m) => (m.bracketSlot ?? 0) + 1))
  return { firstRound: first, rounds: bracketRounds(slots * 2) }
}

const statusOf = (m: MatchView): BracketMatchStatus => {
  if (m.player2 === null) return 'bye'
  if (m.dropped) return 'dropped'
  if (m.status === 'confirmed') return 'final'
  return m.status === 'reported' ? 'confirming' : 'playing'
}

/** A result only counts in the bracket once it is final: until then the winner isn't known. */
const winnerSide = (m: MatchView): 'a' | 'b' | null => {
  if (m.status !== 'confirmed') return null
  return m.outcome === 'p1' || m.outcome === 'bye' ? 'a' : m.outcome === 'p2' ? 'b' : null
}

/**
 * The bracket of an event, round by round, with the rounds still to be paired
 * filled in from the winners known so far. Null before the first elimination round.
 */
export const bracketModel = (source: BracketSource): BracketModel | null => {
  const bracket = bracketFrom(source)
  if (bracket === null) return null
  const seeds = new Map(source.players.map((p) => [p.id, p.seed]))
  const seat = (p: PlayerRef): BracketSeat => ({ id: p.id, name: p.name, seed: seeds.get(p.id) ?? null })

  const rounds: Array<BracketRoundModel> = []
  let current = bracket.firstRound
  for (let i = 0; i < bracket.rounds; i++) {
    const number = bracket.firstRound + i
    const slotCount = 2 ** (bracket.rounds - i - 1)
    const stored = source.matches.filter((m) => m.roundNumber === number && m.bracketSlot !== null)
    const paired = source.rounds.some((r) => r.number === number)
    if (paired) current = number
    const previous = rounds[i - 1]
    const boxes = Array.from({ length: slotCount }, (_, slot): BracketBox => {
      const m = stored.find((x) => x.bracketSlot === slot)
      if (m) {
        return {
          slot,
          match: m,
          table: m.player2 === null ? null : m.table,
          a: seat(m.player1),
          b: m.player2 && seat(m.player2),
          feeds: { a: null, b: null },
          games: m.player2 === null || m.dropped || m.outcome === null ? null : [m.player1Games, m.player2Games],
          winner: winnerSide(m),
          status: statusOf(m),
        }
      }
      // Not paired yet: the winners of slots 2k and 2k+1 of the round before meet here.
      const feed = (k: number) => {
        const from = previous?.boxes[k]
        const winner = from?.winner === 'a' ? from.a : from?.winner === 'b' ? from.b : null
        return { seat: paired ? null : winner, table: from?.table ?? null }
      }
      const [a, b] = [feed(2 * slot), feed(2 * slot + 1)]
      return {
        slot,
        match: null,
        table: null,
        a: a.seat,
        b: b.seat,
        feeds: { a: a.table, b: b.table },
        games: null,
        winner: null,
        status: 'waiting',
      }
    })
    rounds.push({ number, name: roundName(bracket, number), paired, boxes })
  }
  return { bracket, rounds, current }
}

/** How a seat still to be decided reads in a bracket box. */
const undecidedSeat = (table: number | null): string => (table === null ? 'To be decided' : `Winner of table ${table}`)

const seatName = (box: BracketBox, side: 'a' | 'b'): string => {
  const seat = box[side]
  if (seat) return seat.name
  if (box.status === 'bye') return 'Bye'
  return box.match === null ? undecidedSeat(box.feeds[side]) : 'To be decided'
}

/** One seat of a bracket box as shown: its seed, what it reads (the player, "Bye", or who will take it) and games won. */
export const seatLine = (box: BracketBox, side: 'a' | 'b') => ({
  seed: box[side]?.seed ?? null,
  name: seatName(box, side),
  decided: box[side] !== null,
  games: box.games?.[side === 'a' ? 0 : 1] ?? null,
  won: box.winner === side,
  lost: box.winner !== null && box.winner !== side,
})

const hasPlayer = (box: BracketBox, id: string) => box.a?.id === id || box.b?.id === id

/** One tile of the viewer's path: what happened, or will happen, to them in a round. */
export type PathStep =
  | { readonly kind: 'won'; readonly opponent: string | null; readonly score: string | null }
  | { readonly kind: 'lost'; readonly opponent: string | null; readonly score: string | null }
  | { readonly kind: 'bye' }
  | { readonly kind: 'dropped' }
  | { readonly kind: 'playing'; readonly opponent: string; readonly table: number }
  | { readonly kind: 'waiting'; readonly opponent: string | null }
  | { readonly kind: 'out' }

/** The undecided box the viewer's slot feeds, with the viewer in their seat. */
const withViewer = (box: BracketBox | undefined, from: number, viewerId: string): BracketBox | undefined =>
  box && { ...box, [from % 2 === 0 ? 'a' : 'b']: { id: viewerId, name: '', seed: null } }

const firstName = (name: string) => name.split(/\s+/)[0] ?? name

const opponentOf = (box: BracketBox, mine: 'a' | 'b'): string | null => {
  const seat = mine === 'a' ? box.b : box.a
  return seat ? firstName(seat.name) : null
}

/** The viewer's step in a box they sit in. */
const stepIn = (box: BracketBox, viewerId: string): PathStep => {
  const mine = box.a?.id === viewerId ? 'a' : 'b'
  const opponent = opponentOf(box, mine)
  if (box.status === 'bye') return { kind: 'bye' }
  if (box.status === 'waiting') return { kind: 'waiting', opponent }
  if (box.winner === null) return { kind: 'playing', opponent: opponent ?? '', table: box.table ?? 0 }
  return resultStep(box, mine, opponent)
}

/** A decided match from the viewer's side: their games first. */
const resultStep = (box: BracketBox, mine: 'a' | 'b', opponent: string | null): PathStep => {
  const won = box.winner === mine
  if (box.status === 'dropped' && !won) return { kind: 'dropped' }
  const games = box.games && (mine === 'a' ? box.games : ([box.games[1], box.games[0]] as const))
  return { kind: won ? 'won' : 'lost', opponent, score: games ? `${games[0]}–${games[1]}` : null }
}

const ends = (step: PathStep) => step.kind === 'lost' || step.kind === 'dropped' || step.kind === 'out'

/**
 * The viewer's way through the bracket, one step per round. Null when the
 * viewer has no match in it (not entered, or not in the top cut).
 */
export const pathOf = (
  model: BracketModel,
  viewerId: string,
): Array<{ round: BracketRoundModel; step: PathStep }> | null => {
  if (!model.rounds.some((r) => r.boxes.some((b) => b.match !== null && hasPlayer(b, viewerId)))) return null
  let out = false
  let slot: number | null = null
  return model.rounds.map((round) => {
    // In a round not paired yet, the viewer's box is the one their last slot feeds.
    const fed = round.paired || slot === null ? undefined : withViewer(round.boxes[slot >> 1], slot, viewerId)
    const box = round.boxes.find((b) => hasPlayer(b, viewerId)) ?? fed
    if (box) slot = box.slot
    const missing: PathStep = round.paired ? { kind: 'out' } : { kind: 'waiting', opponent: null }
    const step: PathStep = out ? { kind: 'out' } : box ? stepIn(box, viewerId) : missing
    out = ends(step)
    return { round, step }
  })
}

/**
 * What the next round holds, for the store screen's footer: "Final next: Bruno
 * Costa vs the winner of table 1". Null once the last round is paired.
 */
export const nextUp = (model: BracketModel): string | null => {
  const next = model.rounds.find((r) => r.number === model.current + 1)
  if (!next || next.paired) return null
  const side = (seatOf: BracketSeat | null, table: number | null) =>
    seatOf?.name ?? (table === null ? 'to be decided' : `the winner of table ${table}`)
  // A player already through reads first: "Bruno Costa vs the winner of table 1".
  const pairings = next.boxes.map((b) =>
    b.a === null && b.b !== null
      ? `${b.b.name} vs ${side(null, b.feeds.a)}`
      : `${side(b.a, b.feeds.a)} vs ${side(b.b, b.feeds.b)}`,
  )
  return `${next.name} next: ${pairings.join(' · ')}`
}
