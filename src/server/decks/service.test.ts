import { describe, expect, it } from '@effect/vitest'
import { eq } from 'drizzle-orm'
import { Effect, Layer } from 'effect'
import { CardCatalog } from '../catalog/card-catalog.ts'
import { Db } from '../db/client.ts'
import { decks as decksTable } from '../db/schema.ts'
import { asUser, insertUser, withDb } from '../testing.ts'
import { DecksService } from './service.ts'

const art = {
  'TWM 128': 'https://assets.test/sv06/128/low.webp',
  'TWM 130': 'https://assets.test/sv06/130/low.webp',
  'PAL 185': 'https://assets.test/sv02/185/low.webp',
}
const TestLayer = withDb(DecksService.layer.pipe(Layer.provide(CardCatalog.layerTest(art))))

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

  it.effect('stores card art for the printings the catalog knows', () =>
    Effect.gen(function* () {
      const decks = yield* DecksService
      const me = yield* insertUser('Cynthia')
      const { id } = yield* decks.create(deck).pipe(asUser(me))
      expect((yield* decks.get(id)).cardImages).toEqual({ 'TWM 128': art['TWM 128'], 'TWM 130': art['TWM 130'] })

      yield* decks.update(id, { ...deck, list: '3 Dragapult ex TWM 130\n4 Iono PAL 185\n2 Professor\'s Research' }).pipe(asUser(me))
      expect((yield* decks.get(id)).cardImages).toEqual({ 'TWM 130': art['TWM 130'], 'PAL 185': art['PAL 185'] })
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect('backfills art missing from decks saved earlier without touching updatedAt', () =>
    Effect.gen(function* () {
      const decks = yield* DecksService
      const db = yield* Db
      const me = yield* insertUser('Cynthia')
      const { id } = yield* decks.create(deck).pipe(asUser(me))
      yield* db.query((d) => d.update(decksTable).set({ cardImages: {} }).where(eq(decksTable.id, id)))
      const before = (yield* decks.get(id)).updatedAt

      expect(yield* decks.backfillCardImages()).toEqual({ decks: 1, updated: 1 })
      const after = yield* decks.get(id)
      expect(Object.keys(after.cardImages)).toEqual(['TWM 128', 'TWM 130'])
      expect(after.updatedAt).toBe(before)
      expect(yield* decks.backfillCardImages()).toEqual({ decks: 1, updated: 0 })
    }).pipe(Effect.provide(TestLayer)),
  )
})
