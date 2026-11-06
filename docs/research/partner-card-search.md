# Card search for the partner picker

Research for #62 (map #52): how a player finds any Pokémon card to set as their **partner Pokémon**.

Sources: Poké Cards source at commit `bc7e7ef` (github.com/Kaappoo/pokemon-new, read locally) and tcgRank at `34c613b`. Paths below are relative to each repo.

## Answer in short

Poké Cards already has a name search with paging and a Pokémon-only filter, `CatalogService.searchCards`, which powers its own browse grid. It is **not exposed as an HTTP API**: the only public route is `POST /api/cards/lookup`. The smallest addition is a second thin API route, `GET /api/cards/search`, that validates with the existing `cardSearchInput` schema, calls `searchCards` with `category: 'Pokemon'`, and maps rows to the same `small`/`large` image URLs the lookup route returns. tcgRank then adds a `search` method to its `CardCatalog` service, reusing `CARD_CATALOG_URL`, and calls it from a server function (not the browser).

## What Poké Cards exposes today

- **Public API routes:** only `src/routes/api/cards/lookup.ts` (`POST /api/cards/lookup`), plus `api/auth/$` (better-auth) and `api/og/*` (share images). Nothing searches by name.
- **Lookup contract:** body `{ cards: [{ setCode, number }] }`, max 120 refs, each field 1–12 chars (`liveCardLookupInput`, `src/shared/schemas.ts:69`). 400 with `{ error }` on bad input. Response `{ cards: [{ setCode, number, id, name, small, large }] }`, unknown refs left out; `small`/`large` are `{image}/low.webp` / `{image}/high.webp` or null (`cardImageUrl`, `src/domain/catalog.ts:27`). It resolves known printings only (`CatalogService.lookupLiveCards`, matches `sets.live_code` + normalized `local_id`).
- **Auth, CORS, rate limit:** none. The lookup handler has no auth check, sets no CORS headers, and there is no rate-limit middleware anywhere in `src/` (grep for `cors`, `access-control`, `rate limit` finds nothing). It is fine server-to-server; a browser on another origin could not call it.

## The existing internal search

`CatalogService.searchCards` (`src/server/catalog/service.ts:163`), exposed to Poké Cards' own UI only as a TanStack `createServerFn({ method: 'GET' })` (`src/server/functions/catalog.ts:18`). Server functions are served at generated internal URLs, not a stable contract for another app, so tcgRank should not call it directly.

Input, `cardSearchInput` (`src/shared/schemas.ts:23`):

| field | rule |
|---|---|
| `q` | optional, trimmed, max 80; case-insensitive substring on `cards.name` (`ilike '%q%'`, LIKE wildcards escaped by `likeContains`) |
| `set` | optional TCGdex set id (e.g. `sv06`), max 40 |
| `type` | optional energy type (e.g. `Fire`), matched against `cards.types` |
| `category` | optional, one of `Pokemon`, `Trainer`, `Energy` (`CARD_CATEGORIES`, `src/domain/catalog.ts:11`) |
| `includePocket` | default `false`; Pokémon TCG Pocket cards excluded |
| `page` | 1–500, default 1 |
| `perPage` | 1–96, default 48 (`CARDS_PER_PAGE`) |

Behaviour: always excludes cards without published art (`hasImage`), orders newest set first then printed number, returns `{ cards, total, page, perPage, nextPage }` with offset paging and a `count()` for `total`. Each card is a `CardSummary`: `{ id, localId, name, image, setId, setName }` where `image` is the TCGdex base URL (append `/low.webp`). Tested in `src/server/catalog/service.test.ts` (name, type, set, pocket, `%` escaping, paging).

## Data model and the Pokémon/Trainer/Energy question

`cards` table (`src/server/db/schema.ts:62`): `id` (TCGdex global id, `sv03.5-025`), `local_id`, `name`, `image` (base URL, empty until published), `set_id`, `is_pocket`, `category`, `rarity`, `hp`, `types[]`, `raw_data` (full TCGdex payload). Indexes on `name` (plain btree, so `ilike '%…%'` is a sequential scan over ~20k physical cards; acceptable at this size, `pg_trgm` would be the upgrade), `category`, `set_id`, `is_pocket`.

**Supertype:** `category` holds TCGdex's `Pokemon` / `Trainer` / `Energy`, so a `category=Pokemon` filter works server-side. Caveat: it is only written when a card is *enriched* (`enrichedColumns`, `src/server/catalog/rows.ts:6`); the set sync inserts cards with `category` null (`src/server/catalog/sync.ts`). The nightly GitHub Action (`.github/workflows/sync-catalog.yml`, 03:00 UTC) enriches every pending card, so in practice only cards added since the last night are missing, and they drop out of a `category=Pokemon` search until then. Also, `CardSummary` does **not** include `category` in the response today; with the filter applied server-side the picker does not need it.

## How tcgRank calls Poké Cards today

`src/server/catalog/card-catalog.ts`: an Effect service `CardCatalog` built from `Config.String('CARD_CATALOG_URL')` (empty → warning, no-op layer). It `fetch`es `new URL('/api/cards/lookup', baseUrl)` with `POST`, `content-type: application/json`, **no auth header**, a 5 s timeout, decodes with Effect Schema, and swallows every failure (logs, returns `{}`). Tests use `CardCatalog.layerTest(art)`. Env documented in `.env.example` and README; rationale in ADR 0003 (server-side so browsers only load `assets.tcgdex.net` images).

## Recommendation

1. **Poké Cards:** add `src/routes/api/cards/search.ts`, `GET /api/cards/search?q=pikachu&page=1&perPage=24`. Parse query params with `cardSearchInput` (coerce `page`/`perPage` from strings), force `category: 'Pokemon'` and `includePocket: false` (or accept `category` and default it), require `q` of at least 2 characters to avoid paging the whole catalog, and respond `{ cards: [{ id, name, setId, setName, localId, small, large }], total, nextPage }` using `cardImageUrl`. About 30 lines plus a route test; no schema or migration change. Optionally add a `Cache-Control: public, max-age=…` header since results only change nightly.
2. **tcgRank:** add `search(q, page)` to `CardCatalog` next to `lookup`, same `CARD_CATALOG_URL`, same timeout; expose it through a thin server function the picker queries (debounced with Pacer). Store the partner as the TCGdex card `id` plus its `small` image URL, mirroring how decks store resolved art (ADR 0003). Unlike `lookup`, a failed search should surface as an error state in the picker rather than an empty list, so "no results" and "catalog down" are distinguishable.

**Trade-off:** this deepens tcgRank's runtime dependency on Poké Cards: the picker does not work when Poké Cards is down (decks degrade gracefully; search cannot). The alternative, syncing a slim Pokémon-only card table into tcgRank's Turso database, removes that dependency but duplicates the TCGdex sync and its nightly enrichment for a feature used once per profile. Calling the existing service over HTTP is the smaller change; if more cross-app endpoints appear, add a shared secret header and rate limiting to the `/api/cards/*` routes at the same time, since both are currently open.
