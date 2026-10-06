import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { asUser, insertUser, withDb } from '../testing.ts'
import { DecksService } from './service.ts'

const TestLayer = withDb(DecksService.layer)

const deck = {
  name: 'Dragapult ex',
  format: 'standard' as const,
  archetype: 'Dragapult / Dusknoir',
  list: '4 Dreepy TWM 128\n4 Drakloak TWM 129\n3 Dragapult ex TWM 130',
  isPublic: true,
}

describe('DecksService', () => {
  it.effect('creates a deck and stores the parsed card count', () =>
    Effect.gen(function* () {
      const decks = yield* DecksService
      const me = yield* insertUser('Cynthia')
      const { id } = yield* decks.create(deck).pipe(asUser(me))
      const saved = yield* decks.get(id)
      expect(saved).toMatchObject({ name: 'Dragapult ex', cardCount: 11, owner: { id: me.id } })
      expect(yield* decks.listMine().pipe(asUser(me))).toHaveLength(1)
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect('hides private decks from everyone but the owner', () =>
    Effect.gen(function* () {
      const decks = yield* DecksService
      const me = yield* insertUser('Cynthia')
      const other = yield* insertUser('Steven')
      const { id } = yield* decks.create({ ...deck, isPublic: false }).pipe(asUser(me))
      expect((yield* decks.get(id).pipe(asUser(me))).id).toBe(id)
      const error = yield* Effect.flip(decks.get(id).pipe(asUser(other)))
      expect(error._tag).toBe('NotFound')
      expect(yield* decks.listPublic(me.id)).toHaveLength(0)
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect('only the owner can edit or delete', () =>
    Effect.gen(function* () {
      const decks = yield* DecksService
      const me = yield* insertUser('Cynthia')
      const other = yield* insertUser('Steven')
      const { id } = yield* decks.create(deck).pipe(asUser(me))
      const error = yield* Effect.flip(decks.update(id, { ...deck, name: 'Mine now' }).pipe(asUser(other)))
      expect(error._tag).toBe('Forbidden')
      yield* decks.update(id, { ...deck, name: 'Dragapult v2' }).pipe(asUser(me))
      expect((yield* decks.get(id)).name).toBe('Dragapult v2')
      yield* decks.remove(id).pipe(asUser(me))
      expect((yield* Effect.flip(decks.get(id)))._tag).toBe('NotFound')
    }).pipe(Effect.provide(TestLayer)),
  )
})
