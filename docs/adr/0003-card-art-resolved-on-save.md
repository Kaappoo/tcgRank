# 3. Card art resolved on save from the Poké Cards catalog

**Status:** accepted

## Context

Deck pages used to look every card up in the public Pokémon TCG API from the browser: one request per printing, ~30 per deck. Its anonymous rate limit and slow responses made some cards fail at random (reported as CORS errors, because its error responses carry no CORS headers), and a failed lookup was cached as "no art" in the persisted query cache, so it stayed broken. It also lags behind new sets.

The sister app Poké Cards (github.com/Kaappoo/pokemon-new) already syncs the full TCGdex catalog, image URLs included, into its own database.

## Decision

When a deck is created or edited, `DecksService` sends the deck's printings (`SET NUMBER`) in one request to Poké Cards' `POST /api/cards/lookup` (`CARD_CATALOG_URL`) and stores the resulting image URLs on the deck (`decks.card_images`). Pages render plain `<img>` tags from that map. Only printings without stored art are looked up again on later saves; `scripts/backfill-card-images.ts` fills in existing decks.

## Consequences

- Browsers load image files only, from `assets.tcgdex.net`: no CORS, no rate limits, works offline from the service-worker cache, and server and client render the same markup.
- tcgRank depends on Poké Cards being reachable at save time. If it isn't, the deck still saves and the missing art is retried on the next save or backfill.
- Printings Poké Cards can't match (sets without a TCG Live code in TCGdex, or a card with unpublished art) show the typographic placeholder.
