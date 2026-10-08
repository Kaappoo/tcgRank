import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { EventsService } from '../events/service.ts'
import { asUser, insertUser, withDb } from '../testing.ts'
import { ProfilesService, resultFor } from './service.ts'

const TestLayer = withDb(Layer.mergeAll(ProfilesService.layer, EventsService.layer))

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
