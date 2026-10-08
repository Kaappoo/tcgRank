import './env.ts'
import { DecksService } from '../src/server/decks/service.ts'
import { runtime } from '../src/server/runtime.ts'

/**
 * Looks up card art for decks saved before art came from the card catalog
 * (or while it was unreachable). Safe to re-run: resolved cards are skipped.
 *
 *   CARD_CATALOG_URL=https://… pnpm tsx scripts/backfill-card-images.ts
 */
const { decks, updated } = await runtime.runPromise(DecksService.use((s) => s.backfillCardImages()))
console.log(`✓ card art filled in for ${updated} of ${decks} decks`)
await runtime.dispose()
