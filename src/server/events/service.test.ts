import { assert, describe, expect, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { newId } from '#/domain/ids.ts'
import { Db } from '../db/client.ts'
import { decks, type EventFormat } from '../db/schema.ts'
import { asUser, insertUser, withDb } from '../testing.ts'
import { EventsService } from './service.ts'

const TestLayer = withDb(EventsService.layer)

const newEvent = {
  name: 'Tuesday League Challenge',
  storeName: 'Pallet Town Games',
  format: 'standard' as const,
  plannedRounds: 0,
  roundMinutes: 50,
  startsAt: new Date('2026-10-06T19:00:00Z'),
  deckRequired: false,
}

/** Creates a host plus `n` joined players. */
const setup = Effect.fn('setup')(function* (playerCount: number) {
  const events = yield* EventsService
  const host = yield* insertUser('Professor Oak')
  const { id: eventId, joinCode } = yield* events.create(newEvent).pipe(asUser(host))
  const players = []
  for (let i = 0; i < playerCount; i++) {
    const p = yield* insertUser(`Trainer ${i + 1}`)
    yield* events.join(eventId).pipe(asUser(p))
    players.push(p)
  }
  return { events, host, eventId, joinCode, players }
})

const insertDeck = Effect.fn('insertDeck')(function* (
  userId: string,
  options: { format?: EventFormat; cardCount?: number } = {},
) {
  const db = yield* Db
  const id = newId()
  yield* db.query((d) =>
    d.insert(decks).values({
      id,
      userId,
      name: 'Dragapult ex',
      format: options.format ?? 'standard',
      list: '',
      cardCount: options.cardCount ?? 60,
    }),
  )
  return id
})

const run = <A, E>(effect: Effect.Effect<A, E, EventsService | import('../db/client.ts').Db>) =>
  effect.pipe(Effect.provide(TestLayer))

describe('EventsService', () => {
  it.effect('creates an event with a join code and lists it as upcoming', () =>
    run(
      Effect.gen(function* () {
        const { events, joinCode, eventId } = yield* setup(3)
        expect(joinCode).toMatch(/^[A-Z2-9]{6}$/)
        const found = yield* events.findByJoinCode(joinCode.toLowerCase())
        expect(found.id).toBe(eventId)
        expect(found.playerCount).toBe(3)
        const upcoming = yield* events.list({ scope: 'upcoming' })
        expect(upcoming.map((e) => e.id)).toContain(eventId)
      }),
    ),
  )

  it.effect('requires a signed-in user to host', () =>
    run(
      Effect.gen(function* () {
        const events = yield* EventsService
        const error = yield* Effect.flip(events.create(newEvent))
        expect(error._tag).toBe('Unauthenticated')
      }),
    ),
  )

  it.effect('joining twice is idempotent', () =>
    run(
      Effect.gen(function* () {
        const { events, eventId, players } = yield* setup(2)
        yield* events.join(eventId).pipe(asUser(players[0]!))
        const detail = yield* events.detail(eventId)
        expect(detail.players).toHaveLength(2)
      }),
    ),
  )

  it.effect('only the host can start a round', () =>
    run(
      Effect.gen(function* () {
        const { events, eventId, players } = yield* setup(4)
        const error = yield* Effect.flip(events.startNextRound(eventId).pipe(asUser(players[0]!)))
        expect(error._tag).toBe('Forbidden')
      }),
    ),
  )

  it.effect('pairs round one, gives a bye to the odd player and starts the clock', () =>
    run(
      Effect.gen(function* () {
        const { events, eventId, host, players } = yield* setup(5)
        const { roundNumber } = yield* events.startNextRound(eventId).pipe(asUser(host))
        expect(roundNumber).toBe(1)

        const detail = yield* events.detail(eventId).pipe(asUser(players[0]!))
        expect(detail.event.status).toBe('running')
        expect(detail.event.plannedRounds).toBe(3)
        expect(detail.matches).toHaveLength(3)
        const bye = detail.matches.find((m) => m.player2 === null)
        expect(bye?.status).toBe('confirmed')
        expect(detail.rounds[0]?.endsAt).toBeGreaterThan(detail.serverNow)
        assert.isNotNull(detail.viewer?.currentMatch)
      }),
    ),
  )

  it.effect('a reported result needs the opponent to confirm before the next round', () =>
    run(
      Effect.gen(function* () {
        const { events, eventId, host, players } = yield* setup(4)
        yield* events.startNextRound(eventId).pipe(asUser(host))
        const { viewer, matches } = yield* events.detail(eventId).pipe(asUser(players[0]!))
        const match = viewer!.currentMatch!
        const reporter = players.find((p) => p.id === match.player1.id)!
        const opponent = players.find((p) => p.id === match.player2!.id)!
        const otherTable = matches.find((m) => m.id !== match.id)!
        yield* events.reportResult(otherTable.id, 2, 0).pipe(asUser(host))

        const reported = yield* events.reportResult(match.id, 2, 1).pipe(asUser(reporter))
        expect(reported.status).toBe('reported')
        expect(reported.outcome).toBe('p1')

        const blocked = yield* Effect.flip(events.startNextRound(eventId).pipe(asUser(host)))
        expect(blocked._tag).toBe('InvalidState')

        const selfConfirm = yield* Effect.flip(events.confirmResult(match.id).pipe(asUser(reporter)))
        expect(selfConfirm._tag).toBe('InvalidState')

        const confirmed = yield* events.confirmResult(match.id).pipe(asUser(opponent))
        expect(confirmed.status).toBe('confirmed')

        const next = yield* events.startNextRound(eventId).pipe(asUser(host))
        expect(next.roundNumber).toBe(2)
      }),
    ),
  )

  it.effect('the opponent reporting the same score confirms it', () =>
    run(
      Effect.gen(function* () {
        const { events, eventId, host, players } = yield* setup(2)
        yield* events.startNextRound(eventId).pipe(asUser(host))
        const { matches } = yield* events.detail(eventId)
        const match = matches[0]!
        const p1 = players.find((p) => p.id === match.player1.id)!
        const p2 = players.find((p) => p.id === match.player2!.id)!
        yield* events.reportResult(match.id, 1, 1).pipe(asUser(p1))
        const agreed = yield* events.reportResult(match.id, 1, 1).pipe(asUser(p2))
        expect(agreed.status).toBe('confirmed')
        expect(agreed.outcome).toBe('draw')
      }),
    ),
  )

  it.effect('host reports are final immediately', () =>
    run(
      Effect.gen(function* () {
        const { events, eventId, host } = yield* setup(2)
        yield* events.startNextRound(eventId).pipe(asUser(host))
        const { matches } = yield* events.detail(eventId)
        const result = yield* events.reportResult(matches[0]!.id, 0, 2).pipe(asUser(host))
        expect(result).toMatchObject({ status: 'confirmed', outcome: 'p2' })
      }),
    ),
  )

  it.effect('strangers cannot report a match', () =>
    run(
      Effect.gen(function* () {
        const { events, eventId, host } = yield* setup(2)
        const stranger = yield* insertUser('Team Rocket')
        yield* events.startNextRound(eventId).pipe(asUser(host))
        const { matches } = yield* events.detail(eventId)
        const error = yield* Effect.flip(events.reportResult(matches[0]!.id, 2, 0).pipe(asUser(stranger)))
        expect(error._tag).toBe('Forbidden')
      }),
    ),
  )

  it.effect('pauses, resumes and extends the round clock', () =>
    run(
      Effect.gen(function* () {
        const { events, eventId, host } = yield* setup(2)
        yield* events.startNextRound(eventId).pipe(asUser(host))
        yield* events.controlClock(eventId, 'pause').pipe(asUser(host))
        let round = (yield* events.detail(eventId)).rounds[0]!
        expect(round.endsAt).toBeNull()
        expect(round.pausedRemainingMs).toBeGreaterThan(49 * 60_000)

        yield* events.controlClock(eventId, 'adjust', 5).pipe(asUser(host))
        yield* events.controlClock(eventId, 'resume').pipe(asUser(host))
        round = (yield* events.detail(eventId)).rounds[0]!
        expect(round.pausedRemainingMs).toBeNull()
        const { serverNow } = yield* events.detail(eventId)
        expect(round.endsAt! - serverNow).toBeGreaterThan(54 * 60_000)
      }),
    ),
  )

  it.effect('runs a full event to final standings', () =>
    run(
      Effect.gen(function* () {
        const { events, eventId, host } = yield* setup(4)
        for (let round = 1; round <= 3; round++) {
          yield* events.startNextRound(eventId).pipe(asUser(host))
          const { matches } = yield* events.detail(eventId)
          for (const match of matches.filter((m) => m.roundNumber === round && m.status !== 'confirmed')) {
            yield* events.reportResult(match.id, 2, 0).pipe(asUser(host))
          }
        }
        const tooMany = yield* Effect.flip(events.startNextRound(eventId).pipe(asUser(host)))
        expect(tooMany._tag).toBe('InvalidState')

        yield* events.finishEvent(eventId).pipe(asUser(host))
        const detail = yield* events.detail(eventId)
        expect(detail.event.status).toBe('finished')
        expect(detail.players.map((p) => p.finalRank).sort()).toEqual([1, 2, 3, 4])
        const winner = detail.standings[0]!
        expect(winner.points).toBe(9)
        // No rematches across three rounds of four players.
        const pairs = detail.matches.map((m) => [m.player1.id, m.player2?.id].sort().join('|'))
        expect(new Set(pairs).size).toBe(pairs.length)
      }),
    ),
  )

  it.effect('dropping mid-event keeps history but removes the player from pairings', () =>
    run(
      Effect.gen(function* () {
        const { events, eventId, host, players } = yield* setup(4)
        yield* events.startNextRound(eventId).pipe(asUser(host))
        const { matches } = yield* events.detail(eventId)
        for (const m of matches) yield* events.reportResult(m.id, 2, 0).pipe(asUser(host))
        yield* events.leave(eventId).pipe(asUser(players[3]!))
        yield* events.startNextRound(eventId).pipe(asUser(host))
        const detail = yield* events.detail(eventId)
        const round2 = detail.matches.filter((m) => m.roundNumber === 2)
        expect(round2.flatMap((m) => [m.player1.id, m.player2?.id])).not.toContain(players[3]!.id)
        expect(detail.standings.find((s) => s.playerId === players[3]!.id)?.dropped).toBe(true)
      }),
    ),
  )
})

describe('EventsService layer', () => {
  it.effect('builds from the test database', () =>
    Effect.gen(function* () {
      const events = yield* EventsService
      expect(typeof events.detail).toBe('function')
    }).pipe(Effect.provide(Layer.fresh(TestLayer))),
  )
  describe('deck required', () => {
    const requiredEvent = Effect.fn('requiredEvent')(function* () {
      const events = yield* EventsService
      const host = yield* insertUser('Professor Oak')
      const { id: eventId } = yield* events.create({ ...newEvent, deckRequired: true }).pipe(asUser(host))
      return { events, host, eventId }
    })

    it.effect('refuses entry without a registered deck', () =>
      run(
        Effect.gen(function* () {
          const { events, eventId } = yield* requiredEvent()
          const player = yield* insertUser('Ash')
          const error = yield* Effect.flip(events.join(eventId, null).pipe(asUser(player)))
          expect(error).toMatchObject({ _tag: 'InvalidState', reason: 'This event requires a registered deck' })
          const detail = yield* events.detail(eventId)
          expect(detail.event.deckRequired).toBe(true)
          expect(detail.players).toHaveLength(0)
        }),
      ),
    )

    it.effect('accepts a 60-card deck in the event format', () =>
      run(
        Effect.gen(function* () {
          const { events, eventId } = yield* requiredEvent()
          const player = yield* insertUser('Ash')
          const deckId = yield* insertDeck(player.id)
          yield* events.join(eventId, deckId).pipe(asUser(player))
          const detail = yield* events.detail(eventId)
          expect(detail.players[0]?.deckId).toBe(deckId)
        }),
      ),
    )

    it.effect('refuses decks of another format or the wrong size', () =>
      run(
        Effect.gen(function* () {
          const { events, eventId } = yield* requiredEvent()
          const player = yield* insertUser('Ash')
          const expanded = yield* insertDeck(player.id, { format: 'expanded' })
          const short = yield* insertDeck(player.id, { cardCount: 58 })
          const wrongFormat = yield* Effect.flip(events.join(eventId, expanded).pipe(asUser(player)))
          expect(wrongFormat).toMatchObject({ reason: "Dragapult ex can't be registered: Built for Expanded, not Standard" })
          const wrongSize = yield* Effect.flip(events.join(eventId, short).pipe(asUser(player)))
          expect(wrongSize).toMatchObject({ reason: "Dragapult ex can't be registered: Has 58 cards, not 60" })
        }),
      ),
    )

    it.effect('lets players skip the deck when the event does not require one', () =>
      run(
        Effect.gen(function* () {
          const { events, eventId, players } = yield* setup(1)
          const short = yield* insertDeck(players[0]!.id, { cardCount: 40 })
          yield* events.join(eventId, short).pipe(asUser(players[0]!))
          yield* events.join(eventId, null).pipe(asUser(players[0]!))
          const detail = yield* events.detail(eventId)
          expect(detail.players[0]?.deckId).toBeNull()
        }),
      ),
    )

    it.effect('only the host can require decks, and only before round 1', () =>
      run(
        Effect.gen(function* () {
          const { events, host, eventId, players } = yield* setup(2)
          const forbidden = yield* Effect.flip(events.setDeckRequired(eventId, true).pipe(asUser(players[0]!)))
          expect(forbidden._tag).toBe('Forbidden')
          yield* events.setDeckRequired(eventId, true).pipe(asUser(host))
          expect((yield* events.detail(eventId)).event.deckRequired).toBe(true)
          yield* events.startNextRound(eventId).pipe(asUser(host))
          const locked = yield* Effect.flip(events.setDeckRequired(eventId, false).pipe(asUser(host)))
          expect(locked._tag).toBe('InvalidState')
        }),
      ),
    )

    it.effect('locks a registered deck once round 1 starts', () =>
      run(
        Effect.gen(function* () {
          const { events, host, eventId, players } = yield* setup(2)
          const first = yield* insertDeck(players[0]!.id)
          const second = yield* insertDeck(players[0]!.id)
          yield* events.join(eventId, first).pipe(asUser(players[0]!))
          yield* events.startNextRound(eventId).pipe(asUser(host))
          const error = yield* Effect.flip(events.join(eventId, second).pipe(asUser(players[0]!)))
          expect(error).toMatchObject({ reason: 'Registered decks are locked once round 1 starts' })
          // Players who joined without a deck can still register one late.
          const late = yield* insertDeck(players[1]!.id)
          yield* events.join(eventId, late).pipe(asUser(players[1]!))
        }),
      ),
    )
  })
})

describe('Guests', () => {
  it.effect('the host adds a guest by name; nobody else can', () =>
    run(
      Effect.gen(function* () {
        const { events, host, eventId, players } = yield* setup(1)
        const forbidden = yield* Effect.flip(events.addGuest(eventId, { name: 'Gary' }).pipe(asUser(players[0]!)))
        expect(forbidden._tag).toBe('Forbidden')

        const { guestId } = yield* events.addGuest(eventId, { name: '  Gary  ' }).pipe(asUser(host))
        const detail = yield* events.detail(eventId)
        const guest = detail.players.find((p) => p.id === guestId)
        expect(guest).toMatchObject({ name: 'Gary', username: null, isGuest: true })
        expect(detail.players.find((p) => p.id === players[0]!.id)?.isGuest).toBe(false)
      }),
    ),
  )

  it.effect('a guest can be added again to the next event from the host’s guest list', () =>
    run(
      Effect.gen(function* () {
        const { events, host, eventId } = yield* setup(0)
        const { guestId } = yield* events.addGuest(eventId, { name: 'Gary' }).pipe(asUser(host))
        const again = yield* Effect.flip(events.addGuest(eventId, { guestId }).pipe(asUser(host)))
        expect(again).toMatchObject({ reason: 'Gary is already in this event' })
        const sameName = yield* Effect.flip(events.addGuest(eventId, { name: 'gary' }).pipe(asUser(host)))
        expect(sameName._tag).toBe('InvalidState')

        const { id: nextWeek } = yield* events.create(newEvent).pipe(asUser(host))
        const list = yield* events.guests().pipe(asUser(host))
        expect(list).toEqual([expect.objectContaining({ id: guestId, name: 'Gary', eventCount: 1 })])
        yield* events.addGuest(nextWeek, { guestId }).pipe(asUser(host))
        expect((yield* events.detail(nextWeek)).players.map((p) => p.id)).toEqual([guestId])

        // Another host can't enter someone else's guest.
        const otherHost = yield* insertUser('Professor Elm')
        const { id: elmEvent } = yield* events.create(newEvent).pipe(asUser(otherHost))
        const notYours = yield* Effect.flip(events.addGuest(elmEvent, { guestId }).pipe(asUser(otherHost)))
        expect(notYours._tag).toBe('NotFound')
        expect(yield* events.guests().pipe(asUser(otherHost))).toEqual([])
      }),
    ),
  )

  it.effect('guests enter events that require a deck, but not finished ones', () =>
    run(
      Effect.gen(function* () {
        const { events, host, eventId } = yield* setup(1)
        yield* events.setDeckRequired(eventId, true).pipe(asUser(host))
        const { guestId } = yield* events.addGuest(eventId, { name: 'Gary' }).pipe(asUser(host))
        yield* events.startNextRound(eventId).pipe(asUser(host))
        for (const m of (yield* events.detail(eventId)).matches) yield* events.reportResult(m.id, 2, 0).pipe(asUser(host))
        yield* events.finishEvent(eventId).pipe(asUser(host))
        const late = yield* Effect.flip(events.addGuest(eventId, { name: 'Brock' }).pipe(asUser(host)))
        expect(late).toMatchObject({ reason: 'This event has already finished' })
        expect((yield* events.detail(eventId)).players.some((p) => p.id === guestId)).toBe(true)
      }),
    ),
  )

  it.effect('the opponent of a guest reports and the result counts straight away', () =>
    run(
      Effect.gen(function* () {
        const { events, host, eventId, players } = yield* setup(1)
        const { guestId } = yield* events.addGuest(eventId, { name: 'Gary' }).pipe(asUser(host))
        yield* events.startNextRound(eventId).pipe(asUser(host))
        const [match] = (yield* events.detail(eventId)).matches
        expect([match!.player1.id, match!.player2?.id].sort()).toEqual([guestId, players[0]!.id].sort())

        const p1Wins = match!.player1.id === players[0]!.id
        const result = yield* events.reportResult(match!.id, p1Wins ? 2 : 1, p1Wins ? 1 : 2).pipe(asUser(players[0]!))
        expect(result.status).toBe('confirmed')
        // Nothing is left waiting on the guest: the host can close the event.
        yield* events.finishEvent(eventId).pipe(asUser(host))
      }),
    ),
  )

  it.effect('the host removes a guest before round 1 and drops one after', () =>
    run(
      Effect.gen(function* () {
        const { events, host, eventId, players } = yield* setup(2)
        const { guestId: gary } = yield* events.addGuest(eventId, { name: 'Gary' }).pipe(asUser(host))
        const { guestId: brock } = yield* events.addGuest(eventId, { name: 'Brock' }).pipe(asUser(host))
        yield* events.removeGuest(eventId, gary).pipe(asUser(host))
        expect((yield* events.detail(eventId)).players.some((p) => p.id === gary)).toBe(false)

        const notAGuest = yield* Effect.flip(events.removeGuest(eventId, players[0]!.id).pipe(asUser(host)))
        expect(notAGuest._tag).toBe('NotFound')

        yield* events.startNextRound(eventId).pipe(asUser(host))
        yield* events.removeGuest(eventId, brock).pipe(asUser(host))
        expect((yield* events.detail(eventId)).players.find((p) => p.id === brock)?.droppedAtRound).toBe(1)
      }),
    ),
  )

  it.effect('a player claims a guest’s results into their account', () =>
    run(
      Effect.gen(function* () {
        const { events, host, eventId, players } = yield* setup(1)
        const { guestId } = yield* events.addGuest(eventId, { name: 'Gary' }).pipe(asUser(host))
        yield* events.startNextRound(eventId).pipe(asUser(host))
        const [match] = (yield* events.detail(eventId)).matches
        yield* events.reportResult(match!.id, 2, 0).pipe(asUser(host))

        const { claimCode } = (yield* events.guests().pipe(asUser(host)))[0]!
        const preview = yield* events.claimPreview(claimCode)
        expect(preview).toEqual({ name: 'Gary', hostName: 'Professor Oak', eventCount: 1 })

        const ownGuest = yield* Effect.flip(events.claimGuest(claimCode).pipe(asUser(host)))
        expect(ownGuest._tag).toBe('InvalidState')
        const unknown = yield* Effect.flip(events.claimGuest('not-a-code').pipe(asUser(players[0]!)))
        expect(unknown._tag).toBe('NotFound')
        // Gary's opponent is already in that event, so the histories can't merge.
        const clash = yield* Effect.flip(events.claimGuest(claimCode).pipe(asUser(players[0]!)))
        expect(clash._tag).toBe('InvalidState')

        const gary = yield* insertUser('Gary Oak')
        const claimed = yield* events.claimGuest(claimCode).pipe(asUser(gary))
        expect(claimed).toEqual({ eventCount: 1 })
        const detail = yield* events.detail(eventId)
        expect(detail.players.map((p) => p.id)).toContain(gary.id)
        expect(detail.players.map((p) => p.id)).not.toContain(guestId)
        const moved = detail.matches[0]!
        expect([moved.player1.id, moved.player2?.id]).toContain(gary.id)
        expect(yield* events.guests().pipe(asUser(host))).toEqual([])
        expect((yield* Effect.flip(events.claimPreview(claimCode)))._tag).toBe('NotFound')
      }),
    ),
  )
})
