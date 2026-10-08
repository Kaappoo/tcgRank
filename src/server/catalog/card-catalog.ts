import { Config, Context, Duration, Effect, Layer, Schema } from 'effect'

interface CardRef {
  readonly setCode: string
  readonly number: string
}

class CatalogError extends Schema.TaggedError<CatalogError>()('CatalogError', {
  cause: Schema.Defect(),
}) {}

const LookupResponse = Schema.Struct({
  cards: Schema.Array(
    Schema.Struct({ setCode: Schema.String, number: Schema.String, small: Schema.NullOr(Schema.String) }),
  ),
})

/** "TWM 130" — must match `cardArtKey` in the deck-list domain. */
const keyOf = (ref: CardRef) => `${ref.setCode.toUpperCase()} ${ref.number}`

/**
 * Card art for PTCG Live references, from the Poké Cards catalog
 * (github.com/Kaappoo/pokemon-new, `POST /api/cards/lookup`). Looked up on
 * the server when a deck is saved, so browsers only ever load image files.
 * Lookups never fail: an unreachable catalog means no art this time, and the
 * missing cards are tried again on the next save.
 */
export class CardCatalog extends Context.Service<
  CardCatalog,
  {
    /** Image URL by "SET NUMBER" key; unknown cards and cards without art are left out. */
    lookup(refs: ReadonlyArray<CardRef>): Effect.Effect<Record<string, string>>
  }
>()('tcgrank/server/catalog/CardCatalog') {
  static readonly layer = Layer.effect(
    CardCatalog,
    Effect.gen(function* () {
      const baseUrl = yield* Config.String('CARD_CATALOG_URL').pipe(Config.withDefault(''))
      if (!baseUrl) {
        yield* Effect.logWarning('CARD_CATALOG_URL is not set: decks are saved without card art')
        return CardCatalog.of({ lookup: () => Effect.succeed({}) })
      }
      const endpoint = new URL('/api/cards/lookup', baseUrl).href
      const decode = Schema.decodeUnknownEffect(LookupResponse)

      return CardCatalog.of({
        lookup: Effect.fn('CardCatalog.lookup')(function* (refs: ReadonlyArray<CardRef>) {
          if (refs.length === 0) return {}
          return yield* Effect.tryPromise({
            try: async (signal) => {
              const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ cards: refs }),
                signal,
              })
              if (!response.ok) throw new Error(`Card catalog answered ${response.status}`)
              return response.json() as Promise<unknown>
            },
            catch: (cause) => new CatalogError({ cause }),
          }).pipe(
            Effect.flatMap(decode),
            Effect.timeout(Duration.seconds(5)),
            Effect.map(({ cards }) =>
              Object.fromEntries(cards.flatMap((c) => (c.small ? [[keyOf(c), c.small] as const] : []))),
            ),
            Effect.catchCause((cause) =>
              Effect.logWarning('Card catalog lookup failed; saving without new card art', cause).pipe(Effect.as({})),
            ),
          )
        }),
      })
    }),
  )

  /** Fixed catalog for tests, keyed like `cardArtKey` ("TWM 130"). */
  static readonly layerTest = (art: Record<string, string> = {}) =>
    Layer.succeed(
      CardCatalog,
      CardCatalog.of({
        lookup: (refs) =>
          Effect.succeed(Object.fromEntries(refs.flatMap((r) => (art[keyOf(r)] ? [[keyOf(r), art[keyOf(r)]!]] : [])))),
      }),
    )
}
