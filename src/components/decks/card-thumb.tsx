import { useQuery } from '@tanstack/react-query'
import type { DeckCard } from '#/domain/deck-list.ts'
import { cardImageQuery } from '#/lib/card-images.ts'
import { cn } from '#/lib/utils.ts'

/** A card image with its copy count, falling back to a typographic placeholder. */
export function CardThumb({ card, className }: { card: DeckCard; className?: string }) {
  const { data, isLoading } = useQuery(cardImageQuery(card.setCode, card.number))
  return (
    <figure className={cn('group relative', className)}>
      <div className="relative aspect-[63/88] overflow-hidden rounded-[6%] border border-line bg-surface-raised transition-transform duration-300 ease-out-expo group-hover:-translate-y-1 group-hover:rotate-[-1.5deg]">
        {data ? (
          <img src={data.small} alt={card.name} loading="lazy" decoding="async" className="size-full object-cover" />
        ) : (
          <div className={cn('flex size-full flex-col justify-end p-2', isLoading && 'animate-pulse')}>
            <span className="text-xs font-semibold leading-tight">{card.name}</span>
            {card.setCode ? (
              <span className="text-[10px] text-paper-dim">
                {card.setCode} {card.number}
              </span>
            ) : null}
          </div>
        )}
      </div>
      <figcaption className="absolute -top-2 -right-2 flex size-8 items-center justify-center rounded-full bg-orange font-numerals text-lg text-on-orange shadow-[0_6px_14px_-6px_var(--orange)]">
        <span className="sr-only">{card.count} copies of </span>
        {card.count}
        <span className="sr-only"> {card.name}</span>
      </figcaption>
    </figure>
  )
}
