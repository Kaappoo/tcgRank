/**
 * Which matches the standings count and how standings are ordered once a
 * bracket decides the event: single-elimination placement, the Swiss top cut
 * and the stage each bracket player reached. Pure, no IO.
 */
import {
  bracketExits,
  eventBracket,
  placementStage,
  sharedPlacements,
  stagesSoFar,
  topCutPlacements,
  type Bracket,
  type PlacementStage,
} from './bracket.ts'
import type { PairingSystem } from './event-setup.ts'
import { countsInRecord, type Outcome, type Standing } from './standings.ts'

/** A stored match, as far as placement reads it. */
export interface PlacedMatch {
  readonly roundNumber: number
  readonly bracketSlot: number | null
  readonly player1Id: string
  readonly player2Id: string | null
  readonly outcome: Outcome | null
  readonly confirmedAt: unknown
}

/** An entry, as far as placement reads it. */
interface PlacedPlayer {
  readonly id: string
  readonly droppedAtRound: number | null
  /** Stored when the event finishes. */
  readonly finalRank: number | null
  readonly seed: number | null
}

interface PlacedEvent {
  readonly status: 'registration' | 'running' | 'finished'
  readonly pairingSystem: PairingSystem
  readonly plannedRounds: number
  readonly topCutSize: number | null
}

/** The bracket of a Swiss event that has cut; null before the cut and for every other event. */
const topCutOf = (event: Omit<PlacedEvent, 'status'>): Bracket | null => {
  const bracket = eventBracket(event)
  return bracket?.topCutSize !== undefined ? bracket : null
}

/**
 * The matches standings count: every confirmed one except elimination byes. Once a Swiss event has cut, only its Swiss
 * rounds count, so the standings keep the Swiss record and the cut is seeded and placed by Swiss rank.
 */
export const standingsMatches = <M extends PlacedMatch>(
  event: Omit<PlacedEvent, 'status'>,
  matches: ReadonlyArray<M>,
): Array<M> => {
  const lastCounted = topCutOf(event) ? event.plannedRounds : Number.POSITIVE_INFINITY
  return matches.filter(
    (m) =>
      m.confirmedAt !== null &&
      countsInRecord({ bye: m.player2Id === null, elimination: m.bracketSlot !== null }) &&
      m.roundNumber <= lastCounted,
  )
}

const bracketMatches = (bracket: Bracket, matches: ReadonlyArray<PlacedMatch>) =>
  matches.filter((m) => m.bracketSlot !== null && m.roundNumber >= bracket.firstRound)

const droppedIds = (players: ReadonlyArray<Pick<PlacedPlayer, 'id' | 'droppedAtRound'>>) =>
  new Set(players.filter((p) => p.droppedAtRound !== null).map((p) => p.id))

/**
 * Where each player of a bracket went out and the placement that gives. A single-elimination event shares it by round
 * (1, 2, 3, 3, 5…); a top cut orders players knocked out together by Swiss rank, then everyone else in Swiss order.
 * Players who dropped between rounds go out in the round they missed.
 */
export const bracketPlacements = (
  bracket: Bracket,
  players: ReadonlyArray<Pick<PlacedPlayer, 'id' | 'droppedAtRound'>>,
  matches: ReadonlyArray<PlacedMatch>,
  swissOrder: ReadonlyArray<string>,
) => {
  const exits = bracketExits(bracket, bracketMatches(bracket, matches), droppedIds(players))
  return {
    exits,
    placements: bracket.topCutSize === undefined ? sharedPlacements(exits) : topCutPlacements(exits, swissOrder),
  }
}

/**
 * Standings as shown, from the live standings: unchanged while the event runs, except that a top cut being played
 * lists its players first, by seed, with the stage each has reached. Once finished they follow the stored placement
 * (a shared one by seed), so the podium can read the first, and each bracket player gets the stage they reached.
 */
export const placedStandings = <S extends Standing>(
  event: PlacedEvent,
  live: ReadonlyArray<S>,
  players: ReadonlyArray<PlacedPlayer>,
  matches: ReadonlyArray<PlacedMatch>,
): Array<S & { readonly stage: PlacementStage | null }> => {
  const byId = new Map(players.map((p) => [p.id, p]))
  const seed = (s: Standing) => byId.get(s.playerId)?.seed ?? Number.POSITIVE_INFINITY

  if (event.status !== 'finished') {
    const cut = topCutOf(event)
    if (!cut) return live.map((s) => ({ ...s, stage: null }))
    const stages = stagesSoFar(cut, bracketMatches(cut, matches), droppedIds(players))
    const cutSeed = (s: Standing) => (stages.has(s.playerId) ? seed(s) : Number.POSITIVE_INFINITY)
    return [...live]
      .sort((a, b) => cutSeed(a) - cutSeed(b) || a.rank - b.rank)
      .map((s) => ({ ...s, stage: stages.get(s.playerId) ?? null }))
  }

  const bracket = eventBracket(event)
  const exits = bracket ? bracketPlacements(bracket, players, matches, []).exits : new Map<string, number | null>()
  const placement = (s: Standing) => byId.get(s.playerId)?.finalRank ?? s.rank
  const stageOf = (s: Standing) =>
    bracket && exits.has(s.playerId) ? placementStage(bracket, exits.get(s.playerId) ?? null) : null
  return [...live]
    .sort((a, b) => placement(a) - placement(b) || seed(a) - seed(b) || a.rank - b.rank)
    .map((s) => ({ ...s, rank: placement(s), stage: stageOf(s) }))
}
