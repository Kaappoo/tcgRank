import { useState } from 'react'
import type { DeckCard } from '#/domain/deck-list.ts'
import { cn } from '#/lib/utils.ts'

/**
 * A card image with its copy count. Without art (the catalog doesn't know the
 * printing) or when the image fails to load, shows a typographic placeholder.
 */
export function CardThumb({ card, image, className }: { card: DeckCard; image?: string | null; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = Boolean(image) && failedSrc !== image
  return (
    <figure className={cn('group relative', className)}>
      <div className="relative aspect-[63/88] overflow-hidden rounded-[6%] border border-line bg-surface-raised transition-transform duration-300 ease-out-expo group-hover:-translate-y-1 group-hover:rotate-[-1.5deg]">
        {showImage && image ? (
          <img
            src={image}
            alt={card.name}
            loading="lazy"
            decoding="async"
            onError={() => setFailedSrc(image)}
            // Server-rendered images can fail before React hydrates and attaches onError.
            ref={(img) => {
              if (img?.complete && img.naturalWidth === 0) setFailedSrc(image)
            }}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full flex-col justify-end p-2">
            <span className="text-xs font-semibold leading-tight">{card.name}</span>
            {card.setCode ? (
              <span className="text-[10px] text-paper-dim">
                {card.setCode} {card.number}
              </span>
            ) : null}
          </div>
        )}
      </div>
      <figcaption className="absolute -top-2 -right-2 flex size-8 items-center justify-center rounded-full bg-orange font-numerals text-lg text-on-orange shadow-[0_4px_10px_-4px_rgb(0_0_0/0.8)]">
        <span className="sr-only">{card.count} copies of </span>
        {card.count}
        <span className="sr-only"> {card.name}</span>
      </figcaption>
    </figure>
  )
}
