import { Link } from '@tanstack/react-router'
import { Lock } from 'lucide-react'
import { Badge } from '#/components/ui/badge.tsx'
import { featuredPokemon, parseDeckList } from '#/domain/deck-list.ts'
import { formatLabel } from '#/lib/format.ts'
import type { DeckView } from '#/server/decks/service.ts'
import { CardThumb } from './card-thumb.tsx'

export function DeckRow({ deck }: { deck: DeckView }) {
  const featured = featuredPokemon(parseDeckList(deck.list).cards)
  return (
    <Link
      to="/decks/$deckId"
      params={{ deckId: deck.id }}
      className="group grid grid-cols-[3.5rem_1fr_auto] items-center gap-4 rounded-xl border border-transparent px-3 py-3 transition-[background-color,border-color] duration-200 hover:border-line hover:bg-surface sm:grid-cols-[4rem_1fr_auto] sm:px-4"
    >
      {deck.coverImageUrl ? (
        <img
          src={deck.coverImageUrl}
          alt=""
          className="aspect-[63/88] w-full rounded-[6%] object-cover"
          loading="lazy"
        />
      ) : featured ? (
        <CardThumb card={featured} className="[&_figcaption]:hidden" />
      ) : (
        <div className="aspect-[63/88] rounded-[6%] bg-surface-raised" />
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="truncate font-display text-lg">{deck.name}</h3>
        <p className="truncate text-sm text-paper-dim">{deck.archetype ?? featured?.name ?? 'No Pokémon listed yet'}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <Badge variant="outline">{formatLabel(deck.format)}</Badge>
        <span className="flex items-center gap-1.5 text-xs text-paper-dim">
          {!deck.isPublic ? <Lock className="size-3" aria-label="Private" /> : null}
          <span className={deck.cardCount === 60 ? 'tabular' : 'tabular text-loss'}>{deck.cardCount}</span> cards
        </span>
      </div>
    </Link>
  )
}
