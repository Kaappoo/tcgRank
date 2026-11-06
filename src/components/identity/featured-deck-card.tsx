import { Link } from '@tanstack/react-router'
import { DeckCover } from '#/components/decks/deck-cover.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import { featuredPokemon, parseDeckList } from '#/domain/deck-list.ts'
import { formatLabel } from '#/lib/format.ts'
import { cn } from '#/lib/utils.ts'
import type { FeaturedDeck } from '#/server/profiles/service.ts'

/**
 * The deck a player features, as its own card under the trainer card: cover, name, archetype, format, and the
 * player's record in events where it was their registered deck. Opens the deck page.
 */
export function FeaturedDeckCard({ deck, className }: { deck: FeaturedDeck; className?: string }) {
  const archetype = deck.archetype ?? featuredPokemon(parseDeckList(deck.list).cards)?.name ?? null
  return (
    <Link
      to="/decks/$deckId"
      params={{ deckId: deck.id }}
      aria-label={`Featured deck: ${deck.name}`}
      className={cn(
        'grid grid-cols-[4.5rem_1fr_auto] items-center gap-4 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-orange sm:grid-cols-[5rem_1fr_auto] sm:p-5',
        className,
      )}
    >
      <DeckCover deck={deck} />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-xs font-semibold text-paper-dim">Featured deck</p>
        <h2 className="truncate font-display text-xl sm:text-2xl">{deck.name}</h2>
        {archetype ? <p className="truncate text-sm text-paper-dim">{archetype}</p> : null}
      </div>
      <div className="flex flex-col items-end gap-2">
        <Badge variant="outline">{formatLabel(deck.format)}</Badge>
        <span
          className="font-numerals text-3xl leading-none"
          aria-label={`${deck.wins} wins, ${deck.losses} losses, ${deck.draws} ties with this deck`}
        >
          {deck.wins}
          <span className="text-paper-dim">-</span>
          {deck.losses}
          <span className="text-paper-dim">-</span>
          {deck.draws}
        </span>
      </div>
    </Link>
  )
}

/** Where the featured deck goes, on the owner's own profile when none is featured. */
export function FeatureDeckGhost({ className }: { className?: string }) {
  return (
    <Link
      to="/customise"
      search={{ slot: 'deck' }}
      className={cn(
        'flex items-center gap-4 rounded-xl border-2 border-dashed border-line-strong p-4 text-paper-dim transition-colors hover:border-orange hover:text-paper sm:p-5',
        className,
      )}
    >
      <span aria-hidden className="aspect-[63/88] w-12 rounded-[6%] border-2 border-dashed border-line-strong" />
      <span className="font-semibold">Feature a deck</span>
    </Link>
  )
}
