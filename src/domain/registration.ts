import { formatLabel } from '#/lib/format.ts'
import type { EventFormat } from '#/server/db/schema.ts'

const DECK_SIZE = 60

/**
 * Why a deck can't be the registered deck at an event that requires one, or
 * null when it can. A required deck has to be built for the event's format and
 * hold exactly 60 cards.
 */
export const deckIneligibility = (
  deck: { readonly format: EventFormat; readonly cardCount: number },
  eventFormat: EventFormat,
): string | null => {
  if (deck.format !== eventFormat) return `Built for ${formatLabel(deck.format)}, not ${formatLabel(eventFormat)}`
  if (deck.cardCount !== DECK_SIZE) return `Has ${deck.cardCount} cards, not ${DECK_SIZE}`
  return null
}
