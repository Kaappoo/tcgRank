import { and, desc, eq } from 'drizzle-orm'
import { Context, Effect, Layer } from 'effect'
import { cardArtKey, parseDeckList } from '#/domain/deck-list.ts'
import { newId } from '#/domain/ids.ts'
import type { DeckInput } from '#/shared/schemas.ts'
import { CardCatalog } from '../catalog/card-catalog.ts'
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
  /** The printing picked for the cover, by `cardArtKey`; null shows the featured Pokémon (see `coverCard`). */
  readonly coverCard: string | null
  /** Card art by `cardArtKey` ("TWM 130"). Cards the catalog doesn't know are missing. */
  readonly cardImages: Readonly<Record<string, string>>
  readonly isPublic: boolean
  readonly updatedAt: number
  readonly owner: { readonly id: string; readonly name: string; readonly username: string | null }
}

const make = Effect.gen(function* () {
  const db = yield* Db
  const catalog = yield* CardCatalog

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
    coverCard: deck.coverCard,
    cardImages: deck.cardImages,
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
    coverCard: input.coverCard ?? null,
    isPublic: input.isPublic,
  })

  /**
   * Art for every printing in the list. Printings already resolved are kept
   * without asking the catalog again; the rest (new cards, or ones the catalog
   * couldn't answer for last time) are looked up.
   */
  const resolveCardImages = Effect.fn('DecksService.resolveCardImages')(function* (
    list: string,
    known: Readonly<Record<string, string>> = {},
  ) {
    const refs = new Map<string, { setCode: string; number: string }>()
    for (const card of parseDeckList(list).cards) {
      const key = cardArtKey(card)
      if (key && card.setCode && card.number) refs.set(key, { setCode: card.setCode, number: card.number })
    }
    const kept = Object.fromEntries([...refs.keys()].flatMap((key) => (known[key] ? [[key, known[key]]] : [])))
    const missing = [...refs].filter(([key]) => !kept[key]).map(([, ref]) => ref)
    return { ...kept, ...(yield* catalog.lookup(missing)) }
  })

  const create = Effect.fn('DecksService.create')(function* (input: DeckInput) {
    const me = yield* requireUser
    const id = newId()
    const cardImages = yield* resolveCardImages(input.list)
    yield* db.query((d) => d.insert(decks).values({ id, userId: me.id, ...fields(input), cardImages }))
    return { id }
  })

  const update = Effect.fn('DecksService.update')(function* (deckId: string, input: DeckInput) {
    const deck = yield* loadOwned(deckId)
    const cardImages = yield* resolveCardImages(input.list, deck.cardImages)
    yield* db.query((d) => d.update(decks).set({ ...fields(input), cardImages }).where(eq(decks.id, deckId)))
    return { id: deckId }
  })

  /** Fills in art missing from existing decks (decks saved before art lookups, or while the catalog was down). */
  const backfillCardImages = Effect.fn('DecksService.backfillCardImages')(function* () {
    const rows = yield* db.query((d) =>
      d.select({ id: decks.id, list: decks.list, cardImages: decks.cardImages, updatedAt: decks.updatedAt }).from(decks),
    )
    let updated = 0
    for (const row of rows) {
      const cardImages = yield* resolveCardImages(row.list, row.cardImages)
      const unchanged =
        Object.keys(cardImages).length === Object.keys(row.cardImages).length &&
        Object.entries(cardImages).every(([key, url]) => row.cardImages[key] === url)
      if (unchanged) continue
      // Keep updatedAt: filling in art isn't an edit, and deck lists sort by it.
      yield* db.query((d) =>
        d.update(decks).set({ cardImages, updatedAt: row.updatedAt }).where(eq(decks.id, row.id)),
      )
      updated++
    }
    return { decks: rows.length, updated }
  })

  const remove = Effect.fn('DecksService.remove')(function* (deckId: string) {
    yield* loadOwned(deckId)
    yield* db.query((d) => d.delete(decks).where(eq(decks.id, deckId)))
  })

  return { listMine, listPublic, get, create, update, remove, backfillCardImages }
})

export class DecksService extends Context.Service<DecksService, Effect.Success<typeof make>>()(
  'tcgrank/server/decks/DecksService',
) {
  static readonly layer = Layer.effect(DecksService, make)
}
