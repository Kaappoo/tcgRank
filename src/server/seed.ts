import { Effect } from 'effect'
import { DEFAULT_BEST_OF } from '#/domain/best-of.ts'
import type { PairingSystem } from '#/domain/event-setup.ts'
import { CurrentUser, type SessionUser } from './current-user.ts'
import { DecksService } from './decks/service.ts'
import { EventsService } from './events/service.ts'

/** The demo cast: one host and eight players (at least seven are needed for the odd fields). */
export interface DemoPeople {
  readonly host: SessionUser
  readonly players: ReadonlyArray<SessionUser>
}

const decks = [
  [
    'Dragapult ex',
    'Dragapult / Dusknoir',
    '4 Dreepy TWM 128\n4 Drakloak TWM 129\n3 Dragapult ex TWM 130\n4 Arven SVI 166',
  ],
  ['Gardevoir ex', 'Gardevoir / Munkidori', '4 Ralts SVI 84\n2 Kirlia SVI 85\n2 Gardevoir ex SVI 86\n4 Arven SVI 166'],
  [
    'Charizard ex',
    'Charizard / Pidgeot',
    '3 Charmander PAF 7\n2 Charizard ex OBF 125\n2 Pidgeot ex OBF 164\n4 Rare Candy SVI 191',
  ],
] as const

/** Scores reported in table order; the level one is skipped in elimination rounds, where ties are refused. */
const scores = [
  [2, 0],
  [2, 1],
  [1, 2],
  [1, 1],
] as const
const decisiveScores = scores.filter(([a, b]) => a !== b)

const as = <A, E, R>(who: SessionUser, effect: Effect.Effect<A, E, R>) =>
  Effect.provideService(effect, CurrentUser, who)

/**
 * Demo data, created only through the services so every row follows the rules: decks for every player, a finished
 * Cup and a League Challenge live in round 2 (Swiss), a finished round robin with an odd field, a single elimination
 * playing its semifinals after a round-1 bye, and a Swiss event in the first round of its top cut.
 */
export const seedDemo = Effect.fn('seed.demo')(function* ({ host, players }: DemoPeople) {
  const events = yield* EventsService
  const deckService = yield* DecksService

  for (const [i, p] of players.entries()) {
    const [name, archetype, list] = decks[i % decks.length]!
    yield* as(p, deckService.create({ name, archetype, list, format: 'standard', isPublic: true }))
  }

  const createEvent = (
    name: string,
    pairingSystem: PairingSystem,
    options: { plannedRounds?: number; topCut?: boolean } = {},
  ) =>
    as(
      host,
      events.create({
        name,
        storeName: 'Pallet Town Games',
        format: 'standard',
        plannedRounds: options.plannedRounds ?? 3,
        roundMinutes: 50,
        startsAt: new Date(),
        deckRequired: false,
        bestOf: DEFAULT_BEST_OF,
        pairingSystem,
        topCut: options.topCut ?? false,
      }),
    )

  /** Reports the open matches of round `r` as the host; `limit` leaves the rest of the round in play. */
  const reportRound = Effect.fn('seed.reportRound')(function* (eventId: string, r: number, limit?: number) {
    const detail = yield* events.detail(eventId)
    const elimination = detail.rounds.find((round) => round.number === r)?.elimination ?? false
    const open = detail.matches.filter((m) => m.roundNumber === r && m.status !== 'confirmed')
    const table = elimination ? decisiveScores : scores
    for (const [t, m] of open.slice(0, limit).entries()) {
      const [a, b] = table[t % table.length]!
      yield* as(host, events.reportResult(m.id, a, b))
    }
  })

  const playEvent = Effect.fn('seed.playEvent')(function* (name: string, rounds: number, finish: boolean) {
    const { id } = yield* createEvent(name, 'swiss')
    for (const p of players) yield* as(p, events.join(id))
    for (let r = 1; r <= rounds; r++) {
      yield* as(host, events.startNextRound(id))
      // Leave the last round of a live event partially reported so the hub has something to show.
      yield* reportRound(id, r, !finish && r === rounds ? 2 : undefined)
    }
    if (finish) yield* as(host, events.finishEvent(id))
    return id
  })

  const cup = yield* playEvent('Pallet Town League Cup', 3, true)
  const live = yield* playEvent('Tuesday League Challenge', 2, false)

  const roundRobin = yield* Effect.gen(function* () {
    const { id } = yield* createEvent('Cerulean Round Robin', 'round_robin')
    // Seven players: one sits out each round, so every player gets a bye.
    for (const p of players.slice(0, 7)) yield* as(p, events.join(id))
    for (let r = 1; ; r++) {
      yield* as(host, events.startNextRound(id))
      yield* reportRound(id, r)
      const { event } = yield* events.detail(id)
      if (event.currentRound >= event.plannedRounds) break
    }
    yield* as(host, events.finishEvent(id))
    return id
  })

  const singleElimination = yield* Effect.gen(function* () {
    const { id } = yield* createEvent('Viridian Knockout', 'single_elimination')
    // Seven players in a bracket of eight: the top seed gets the round-1 bye.
    for (const p of players.slice(0, 7)) yield* as(p, events.join(id))
    yield* as(host, events.startNextRound(id))
    yield* reportRound(id, 1)
    yield* as(host, events.startNextRound(id))
    // One semifinal is in, the other is still being played.
    yield* reportRound(id, 2, 1)
    return id
  })

  const topCut = yield* Effect.gen(function* () {
    const { id } = yield* createEvent('Saffron Regional Qualifier', 'swiss', { plannedRounds: 3, topCut: true })
    for (const p of players) yield* as(p, events.join(id))
    for (let r = 1; r <= 3; r++) {
      yield* as(host, events.startNextRound(id))
      yield* reportRound(id, r)
    }
    const { roundNumber } = yield* as(host, events.cutToTop(id, 4, 40))
    // One top-4 semifinal is in, the other is still being played.
    yield* reportRound(id, roundNumber, 1)
    return id
  })

  return { cup, live, roundRobin, singleElimination, topCut }
})
