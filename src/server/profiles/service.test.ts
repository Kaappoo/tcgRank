import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { DEFAULT_BEST_OF } from '#/domain/best-of.ts'
import type { PairingSystem } from '#/domain/event-setup.ts'
import type { CreateEventInput } from '#/shared/schemas.ts'
import { EventsService } from '../events/service.ts'
import type { MatchView } from '../events/views.ts'
import type { SessionUser } from '../current-user.ts'
import { asUser, insertUser, withDb } from '../testing.ts'
import { ProfilesService, resultFor } from './service.ts'

const TestLayer = withDb(Layer.mergeAll(ProfilesService.layer, EventsService.layer))

const newEvent: CreateEventInput = {
  name: 'Cup',
  storeName: 'Nimbasa Games',
  format: 'standard',
  plannedRounds: 0,
  roundMinutes: 50,
  startsAt: new Date(),
  deckRequired: false,
  bestOf: DEFAULT_BEST_OF,
  pairingSystem: 'swiss',
  topCut: false,
}

/** A host and three players in an event of the given pairing system, round 1 paired. */
const threePlayers = Effect.fn('threePlayers')(function* (pairingSystem: PairingSystem) {
  const events = yield* EventsService
  const host = yield* insertUser('Elesa')
  const players = [yield* insertUser('Ash'), yield* insertUser('Gary'), yield* insertUser('Misty')]
  const { id } = yield* events.create({ ...newEvent, name: 'Gym Night', pairingSystem }).pipe(asUser(host))
  for (const p of players) yield* events.join(id).pipe(asUser(p))
  yield* events.startNextRound(id).pipe(asUser(host))
  const byPlayer = (playerId: string) => players.find((p) => p.id === playerId)!
  return { events, host, id, byPlayer }
})

/** The host confirms the round's one played match as a 2–0 win for the player it names. */
const hostReports = Effect.fn('hostReports')(function* (
  host: SessionUser,
  eventId: string,
  roundNumber: number,
  winner: (m: MatchView) => string,
) {
  const events = yield* EventsService
  const match = (yield* events.detail(eventId)).matches.find((m) => m.roundNumber === roundNumber && m.player2)!
  const p1Wins = winner(match) === match.player1.id
  yield* events.reportResult(match.id, p1Wins ? 2 : 0, p1Wins ? 0 : 2).pipe(asUser(host))
  return match
})

describe('resultFor', () => {
  it('maps stored outcomes to the player perspective', () => {
    const m = { player1Id: 'a', player2Id: 'b', outcome: 'p1' as const }
    expect(resultFor('a', m)).toBe('win')
    expect(resultFor('b', m)).toBe('loss')
    expect(resultFor('a', { ...m, outcome: 'draw' })).toBe('draw')
    expect(resultFor('a', { player1Id: 'a', player2Id: null, outcome: 'bye' })).toBe('bye')
    expect(resultFor('a', { ...m, outcome: null })).toBeNull()
  })
})

describe('ProfilesService', () => {
  it.effect('aggregates match history and finishes into a profile', () =>
    Effect.gen(function* () {
      const events = yield* EventsService
      const profiles = yield* ProfilesService
      const host = yield* insertUser('Elesa')
      const ash = yield* insertUser('Ash')
      const gary = yield* insertUser('Gary')

      const { id } = yield* events
        .create({
          name: 'Cup',
          storeName: 'Nimbasa Games',
          format: 'standard',
          plannedRounds: 1,
          roundMinutes: 50,
          startsAt: new Date(),
          deckRequired: false,
          bestOf: DEFAULT_BEST_OF,
          pairingSystem: 'swiss',
          topCut: false,
        })
        .pipe(asUser(host))
      yield* events.join(id).pipe(asUser(ash))
      yield* events.join(id).pipe(asUser(gary))
      yield* events.startNextRound(id).pipe(asUser(host))
      const { matches } = yield* events.detail(id)
      const match = matches[0]!
      const ashIsP1 = match.player1.id === ash.id
      yield* events.reportResult(match.id, ashIsP1 ? 2 : 1, ashIsP1 ? 1 : 2).pipe(asUser(host))
      yield* events.finishEvent(id).pipe(asUser(host))

      const profile = yield* profiles.byUsername(ash.username!.toUpperCase())
      expect(profile.stats).toMatchObject({ eventsPlayed: 1, wins: 1, losses: 0, winRate: 1, bestFinish: 1 })
      expect(profile.matches[0]).toMatchObject({ result: 'win', score: '2–1', opponent: { id: gary.id } })
      expect(profile.events[0]).toMatchObject({ finalRank: 1, playerCount: 2, wins: 1 })

      const hostProfile = yield* profiles.byUsername(host.username!)
      expect(hostProfile.stats.eventsHosted).toBe(1)
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect('a bye in a bracket shows in the match list but counts as nothing in the record', () =>
    Effect.gen(function* () {
      const profiles = yield* ProfilesService
      const { events, host, id, byPlayer } = yield* threePlayers('single_elimination')
      const bye = (yield* events.detail(id)).matches.find((m) => m.player2 === null)!
      const seedOne = byPlayer(bye.player1.id)
      // Seed 1 had the bye, then loses the final.
      const semifinal = yield* hostReports(host, id, 1, (m) => m.player1.id)
      yield* events.startNextRound(id).pipe(asUser(host))
      const final = yield* hostReports(host, id, 2, (m) => (m.player1.id === seedOne.id ? m.player2!.id : m.player1.id))
      yield* events.finishEvent(id).pipe(asUser(host))

      const profile = yield* profiles.byUsername(seedOne.username!)
      expect(profile.matches.map((m) => m.result)).toEqual(['loss', 'bye'])
      expect(profile.matches.map((m) => m.roundLabel)).toEqual(['Final', 'Semifinal'])
      expect(profile.stats).toMatchObject({ wins: 0, losses: 1, draws: 0, winRate: 0 })
      expect(profile.events[0]).toMatchObject({ wins: 0, losses: 1, draws: 0 })

      const champion = final.player1.id === seedOne.id ? final.player2! : final.player1
      const stagesReached = yield* Effect.forEach([seedOne.id, champion.id, semifinal.player2!.id], (playerId) =>
        profiles.byUsername(byPlayer(playerId).username!),
      )
      expect(stagesReached.map((p) => [p.events[0]!.finalRank, p.events[0]!.stage, p.stats.bestFinish])).toEqual([
        [2, 'Finalist', 2],
        [1, 'Champion', 1],
        [3, 'Semifinal', 3],
      ])
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect('a Swiss bye counts as a win', () =>
    Effect.gen(function* () {
      const profiles = yield* ProfilesService
      const { events, id, byPlayer } = yield* threePlayers('swiss')
      const bye = (yield* events.detail(id)).matches.find((m) => m.player2 === null)!

      const profile = yield* profiles.byUsername(byPlayer(bye.player1.id).username!)
      expect(profile.matches.map((m) => m.result)).toEqual(['bye'])
      expect(profile.matches.map((m) => m.roundLabel)).toEqual(['Round 1'])
      expect(profile.stats).toMatchObject({ wins: 1, losses: 0, winRate: 1 })
      expect(profile.events[0]).toMatchObject({ wins: 1, stage: null })
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect('rejects a username that is already taken', () =>
    Effect.gen(function* () {
      const profiles = yield* ProfilesService
      const a = yield* insertUser('Red')
      const b = yield* insertUser('Blue')
      const error = yield* Effect.flip(profiles.updateMine({ name: 'Blue', username: a.username! }).pipe(asUser(b)))
      expect(error._tag).toBe('InvalidState')
      const ok = yield* profiles.updateMine({ name: 'Blue', username: 'Blue_Oak' }).pipe(asUser(b))
      expect(ok.username).toBe('blue_oak')
    }).pipe(Effect.provide(TestLayer)),
  )
})
