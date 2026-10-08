import { cardArtKey, featuredPokemon, parseDeckList } from '#/domain/deck-list.ts'
import { cn } from '#/lib/utils.ts'
import type { DeckView } from '#/server/decks/service.ts'
import { CardThumb } from './card-thumb.tsx'

/** A deck's face: its cover photo, else its most-played Pokémon, else a blank card. */
export function DeckCover({ deck, className }: { deck: DeckView; className?: string }) {
  if (deck.coverImageUrl) {
    return (
      <img
        src={deck.coverImageUrl}
        alt=""
        className={cn('aspect-[63/88] w-full rounded-[6%] object-cover', className)}
        loading="lazy"
      />
    )
  }
  const featured = featuredPokemon(parseDeckList(deck.list).cards)
  if (!featured) return <div className={cn('aspect-[63/88] rounded-[6%] bg-surface-raised', className)} />
  return (
    <CardThumb
      card={featured}
      image={deck.cardImages[cardArtKey(featured) ?? '']}
      className={cn('[&_figcaption]:hidden', className)}
    />
  )
}
