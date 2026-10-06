import { and, desc, eq } from 'drizzle-orm'
import { Context, Effect, Layer } from 'effect'
import { parseDeckList } from '#/domain/deck-list.ts'
import { newId } from '#/domain/ids.ts'
import type { DeckInput } from '#/shared/schemas.ts'
import { optionalUser, requireUser } from '../current-user.ts'
import { Db } from '../db/client.ts'
import { decks, user, type DeckRow } from '../db/schema.ts'
import { Forbidden, NotFound } from '../errors.ts'

export interface DeckView {
  readonly id: string
  readonly name: string
  readonly format: DeckRow['format']
  readonly archetype: string | null
  readonly list: string
  readonly cardCount: number
  readonly coverImageUrl: string | null
  readonly isPublic: boolean
  readonly updatedAt: number
  readonly owner: { readonly id: string; readonly name: string; readonly username: string | null }
}

const make = Effect.gen(function* () {
  const db = yield* Db

  const select = () =>
    db.drizzle
      .select({ deck: decks, owner: { id: user.id, name: user.name, username: user.username } })
      .from(decks)
      .innerJoin(user, eq(user.id, decks.userId))

  const toView = ({ deck, owner }: { deck: DeckRow; owner: DeckView['owner'] }): DeckView => ({
    id: deck.id,
    name: deck.name,
    format: deck.format,
    archetype: deck.archetype,
    list: deck.list,
    cardCount: deck.cardCount,
    coverImageUrl: deck.coverImageUrl,
    isPublic: deck.isPublic,
    updatedAt: deck.updatedAt.getTime(),
    owner,
  })

  const listMine = Effect.fn('DecksService.listMine')(function* () {
    const me = yield* requireUser
    const rows = yield* db.query(() => select().where(eq(decks.userId, me.id)).orderBy(desc(decks.updatedAt)))
    return rows.map(toView)
  })

  const listPublic = Effect.fn('DecksService.listPublic')(function* (userId: string) {
    const rows = yield* db.query(() =>
      select()
        .where(and(eq(decks.userId, userId), eq(decks.isPublic, true)))
        .orderBy(desc(decks.updatedAt)),
    )
    return rows.map(toView)
  })

  const get = Effect.fn('DecksService.get')(function* (deckId: string) {
    const me = yield* optionalUser
    const [row] = yield* db.query(() => select().where(eq(decks.id, deckId)).limit(1))
    if (!row || (!row.deck.isPublic && row.deck.userId !== me?.id)) {
      return yield* new NotFound({ entity: 'Deck', id: deckId })
    }
    return toView(row)
  })

  const loadOwned = Effect.fn('DecksService.loadOwned')(function* (deckId: string) {
    const me = yield* requireUser
    const deck = yield* db.query((d) => d.query.decks.findFirst({ where: eq(decks.id, deckId) }))
    if (!deck) return yield* new NotFound({ entity: 'Deck', id: deckId })
    if (deck.userId !== me.id) return yield* new Forbidden({ reason: 'That deck belongs to someone else' })
    return deck
  })

  const fields = (input: DeckInput) => ({
    name: input.name,
    format: input.format,
    archetype: input.archetype || null,
    list: input.list,
    cardCount: parseDeckList(input.list).total,
    coverImageUrl: input.coverImageUrl ?? null,
    isPublic: input.isPublic,
  })

  const create = Effect.fn('DecksService.create')(function* (input: DeckInput) {
    const me = yield* requireUser
    const id = newId()
    yield* db.query((d) => d.insert(decks).values({ id, userId: me.id, ...fields(input) }))
    return { id }
  })

  const update = Effect.fn('DecksService.update')(function* (deckId: string, input: DeckInput) {
    yield* loadOwned(deckId)
    yield* db.query((d) => d.update(decks).set(fields(input)).where(eq(decks.id, deckId)))
    return { id: deckId }
  })

  const remove = Effect.fn('DecksService.remove')(function* (deckId: string) {
    yield* loadOwned(deckId)
    yield* db.query((d) => d.delete(decks).where(eq(decks.id, deckId)))
  })

  return { listMine, listPublic, get, create, update, remove }
})

export class DecksService extends Context.Service<DecksService, Effect.Success<typeof make>>()(
  'tcgrank/server/decks/DecksService',
) {
  static readonly layer = Layer.effect(DecksService, make)
}
