import { Config, Context, Duration, Effect, Layer, Schema } from 'effect'
import { CatalogUnavailable } from '../errors.ts'

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

const CatalogCardSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  setId: Schema.String,
  setName: Schema.String,
  localId: Schema.String,
  small: Schema.NullOr(Schema.String),
  large: Schema.NullOr(Schema.String),
})

const SearchResponse = Schema.Struct({
  cards: Schema.Array(CatalogCardSchema),
  total: Schema.Number,
  nextPage: Schema.NullOr(Schema.Number),
})

/** A Pokémon card from the catalog's search, newest sets first. */
export type CatalogCard = typeof CatalogCardSchema.Type
export type CardSearchResult = typeof SearchResponse.Type

/** A search needs at least this many characters. */
export const MIN_SEARCH_LENGTH = 2
const PER_PAGE = 24

/** "TWM 130" — must match `cardArtKey` in the deck-list domain. */
const keyOf = (ref: CardRef) => `${ref.setCode.toUpperCase()} ${ref.number}`

const noResults: CardSearchResult = { cards: [], total: 0, nextPage: null }

/**
 * Card art for PTCG Live references and Pokémon card search, from the Poké Cards catalog
 * (github.com/Kaappoo/pokemon-new: `POST /api/cards/lookup`, `GET /api/cards/search`). Called on the server only,
 * so browsers only ever load image files.
 */
export class CardCatalog extends Context.Service<
  CardCatalog,
  {
    /**
     * Image URL by "SET NUMBER" key; unknown cards and cards without art are left out. Never fails: an unreachable
     * catalog means no art this time, and the missing cards are tried again on the next save.
     */
    lookup(refs: ReadonlyArray<CardRef>): Effect.Effect<Record<string, string>>
    /**
     * Pokémon cards (no Trainer, Energy or Pocket cards) whose name contains the query, newest sets first. Unlike
     * lookup, an unreachable catalog fails, so "no results" and "unreachable" stay apart.
     */
    search(query: string, page: number): Effect.Effect<CardSearchResult, CatalogUnavailable>
  }
>()('tcgrank/server/catalog/CardCatalog') {
  static readonly layer = Layer.effect(
    CardCatalog,
    Effect.gen(function* () {
      const baseUrl = yield* Config.String('CARD_CATALOG_URL').pipe(Config.withDefault(''))
      if (!baseUrl) {
        yield* Effect.logWarning('CARD_CATALOG_URL is not set: decks are saved without card art, partner search is off')
        return CardCatalog.of({
          lookup: () => Effect.succeed({}),
          search: () => Effect.fail(new CatalogUnavailable({ cause: new Error('CARD_CATALOG_URL is not set') })),
        })
      }
      const lookupEndpoint = new URL('/api/cards/lookup', baseUrl).href
      const decodeLookup = Schema.decodeUnknownEffect(LookupResponse)
      const decodeSearch = Schema.decodeUnknownEffect(SearchResponse)

      const fetchJson = (url: string, init?: RequestInit) =>
        Effect.tryPromise({
          try: async (signal) => {
            const response = await fetch(url, { ...init, signal })
            if (!response.ok) throw new Error(`Card catalog answered ${response.status}`)
            return response.json() as Promise<unknown>
          },
          catch: (cause) => new CatalogError({ cause }),
        }).pipe(Effect.timeout(Duration.seconds(5)))

      return CardCatalog.of({
        lookup: Effect.fn('CardCatalog.lookup')(function* (refs: ReadonlyArray<CardRef>) {
          if (refs.length === 0) return {}
          return yield* fetchJson(lookupEndpoint, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ cards: refs }),
          }).pipe(
            Effect.flatMap(decodeLookup),
            Effect.map(({ cards }) =>
              Object.fromEntries(cards.flatMap((c) => (c.small ? [[keyOf(c), c.small] as const] : []))),
            ),
            Effect.catchCause((cause) =>
              Effect.logWarning('Card catalog lookup failed; saving without new card art', cause).pipe(Effect.as({})),
            ),
          )
        }),
        search: Effect.fn('CardCatalog.search')(function* (query: string, page: number) {
          const q = query.trim()
          if (q.length < MIN_SEARCH_LENGTH) return noResults
          const url = new URL('/api/cards/search', baseUrl)
          url.search = new URLSearchParams({ q, page: String(page), perPage: String(PER_PAGE) }).toString()
          return yield* fetchJson(url.href).pipe(
            Effect.flatMap(decodeSearch),
            Effect.catchCause((cause) =>
              Effect.logWarning('Card catalog search failed', cause).pipe(
                Effect.andThen(Effect.fail(new CatalogUnavailable({ cause }))),
              ),
            ),
          )
        }),
      })
    }),
  )

  /**
   * Fixed catalog for tests: art keyed like `cardArtKey` ("TWM 130"), and the cards search finds by name, or
   * `'unreachable'` for a catalog whose search fails.
   */
  static readonly layerTest = (
    art: Record<string, string> = {},
    cards: ReadonlyArray<CatalogCard> | 'unreachable' = [],
  ) =>
    Layer.succeed(
      CardCatalog,
      CardCatalog.of({
        lookup: (refs) =>
          Effect.succeed(Object.fromEntries(refs.flatMap((r) => (art[keyOf(r)] ? [[keyOf(r), art[keyOf(r)]!]] : [])))),
        search: (query, page) => {
          if (cards === 'unreachable') return Effect.fail(new CatalogUnavailable({ cause: new Error('unreachable') }))
          const q = query.trim().toLowerCase()
          if (q.length < MIN_SEARCH_LENGTH) return Effect.succeed(noResults)
          const found = cards.filter((c) => c.name.toLowerCase().includes(q))
          const start = (page - 1) * PER_PAGE
          return Effect.succeed({
            cards: found.slice(start, start + PER_PAGE),
            total: found.length,
            nextPage: start + PER_PAGE < found.length ? page + 1 : null,
          })
        },
      }),
    )
}
