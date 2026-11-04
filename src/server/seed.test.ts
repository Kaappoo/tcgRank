import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { CardCatalog } from './catalog/card-catalog.ts'
import { DecksService } from './decks/service.ts'
import { EventsService } from './events/service.ts'
import { seedDemo } from './seed.ts'
import { insertUser, withDb } from './testing.ts'

const TestLayer = withDb(
  Layer.mergeAll(EventsService.layer, DecksService.layer.pipe(Layer.provide(CardCatalog.layerTest()))),
)

/** Seeds the demo with a host and eight players, then reads one of its events back through the service. */
const seeded = Effect.fn('seeded')(function* (pick: (ids: Effect.Success<ReturnType<typeof seedDemo>>) => string) {
  const host = yield* insertUser('Professor Oak')
  const players = []
  for (const name of ['Ash', 'Misty', 'Brock', 'Gary', 'Dawn', 'Iris', 'Serena', 'Cynthia']) {
    players.push(yield* insertUser(name))
  }
  const ids = yield* seedDemo({ host, players })
  return yield* (yield* EventsService).detail(pick(ids))
})

describe('seedDemo', () => {
  it.effect('keeps the finished Swiss Cup and the League Challenge live in round 2', () =>
    Effect.gen(function* () {
      const cup = yield* seeded((ids) => ids.cup)
      expect(cup.event).toMatchObject({ pairingSystem: 'swiss', status: 'finished', currentRound: 3, topCut: false })
      expect(cup.players).toHaveLength(8)
      const live = yield* seeded((ids) => ids.live)
      expect(live.event).toMatchObject({ pairingSystem: 'swiss', status: 'running', currentRound: 2, plannedRounds: 3 })
      expect(live.matches.filter((m) => m.roundNumber === 2 && m.status === 'playing')).toHaveLength(2)
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect('plays a round-robin event with an odd field to the end and stores its placements', () =>
    Effect.gen(function* () {
      const { event, players, rounds, matches } = yield* seeded((ids) => ids.roundRobin)
      expect(event.pairingSystem).toBe('round_robin')
      expect(event.status).toBe('finished')
      expect(players).toHaveLength(7)
      expect(rounds).toHaveLength(7)
      const byes = matches.filter((m) => m.player2 === null)
      expect(byes).toHaveLength(7)
      expect(new Set(byes.map((m) => m.player1.id)).size).toBe(7)
      expect(players.map((p) => p.finalRank).sort((a, b) => a! - b!)).toEqual([1, 2, 3, 4, 5, 6, 7])
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect('leaves a single-elimination event playing its semifinals after a round-1 bye', () =>
    Effect.gen(function* () {
      const { event, players, matches } = yield* seeded((ids) => ids.singleElimination)
      expect(event.pairingSystem).toBe('single_elimination')
      expect(event.status).toBe('running')
      expect(players).toHaveLength(7)
      expect(event.plannedRounds).toBe(3)
      expect(event.currentRound).toBe(2)
      const topSeed = players.find((p) => p.seed === 1)!
      const round1 = matches.filter((m) => m.roundNumber === 1)
      expect(round1.filter((m) => m.player2 === null).map((m) => m.player1.id)).toEqual([topSeed.id])
      expect(round1.every((m) => m.status === 'confirmed')).toBe(true)
      const semifinals = matches.filter((m) => m.roundNumber === 2)
      expect(semifinals).toHaveLength(2)
      expect(semifinals.some((m) => m.status === 'playing')).toBe(true)
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect('leaves a Swiss event in the first round of its top cut', () =>
    Effect.gen(function* () {
      const { event, players, rounds, matches } = yield* seeded((ids) => ids.topCut)
      expect(event.pairingSystem).toBe('swiss')
      expect(event.status).toBe('running')
      expect(event.topCut).toBe(true)
      expect(event.topCutSize).toBe(4)
      expect(event.currentRound).toBe(event.plannedRounds + 1)
      expect(rounds.map((r) => r.elimination)).toEqual([...Array(event.plannedRounds).fill(false), true])
      expect(players.filter((p) => p.seed !== null)).toHaveLength(4)
      const cutRound = matches.filter((m) => m.roundNumber === event.currentRound)
      expect(cutRound).toHaveLength(2)
      expect(cutRound.some((m) => m.status === 'playing')).toBe(true)
    }).pipe(Effect.provide(TestLayer)),
  )
})
