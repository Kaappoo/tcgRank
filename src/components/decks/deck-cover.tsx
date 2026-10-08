import { useMemo } from 'react'
import { cardArtKey, coverCard, parseDeckList } from '#/domain/deck-list.ts'
import { cn } from '#/lib/utils.ts'
import type { DeckView } from '#/server/decks/service.ts'
import { CardThumb } from './card-thumb.tsx'

/** A deck's face: the card picked as its cover, else its most-played Pokémon, else a blank card. */
export function DeckCover({
  deck,
  className,
}: {
  deck: Pick<DeckView, 'list' | 'coverCard' | 'cardImages'>
  className?: string
}) {
  const card = useMemo(() => coverCard(parseDeckList(deck.list).cards, deck.coverCard), [deck.list, deck.coverCard])
  if (!card) return <div className={cn('aspect-[63/88] rounded-[6%] bg-surface-raised', className)} />
  return (
    <CardThumb
      card={card}
      image={deck.cardImages[cardArtKey(card) ?? '']}
      className={cn('[&_figcaption]:hidden', className)}
    />
  )
}
