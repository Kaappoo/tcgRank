import { useMemo } from 'react'
import { cardArtKey, parseDeckList } from '#/domain/deck-list.ts'
import { CardThumb } from './card-thumb.tsx'

/** Pick any card in the list as the deck's cover. Nothing picked shows the most-played Pokémon. */
export function CoverPicker({
  list,
  cardImages,
  value,
  onChange,
}: {
  list: string
  cardImages: Readonly<Record<string, string>>
  /** `cardArtKey` of the chosen printing, or null for the automatic cover. */
  value: string | null
  onChange: (key: string | null) => void
}) {
  // One choice per printing: the same card can sit on two lines of a list.
  const printings = useMemo(() => {
    const seen = new Map<string, ReturnType<typeof parseDeckList>['cards'][number]>()
    for (const card of parseDeckList(list).cards) {
      const key = cardArtKey(card)
      if (key && !seen.has(key)) seen.set(key, card)
    }
    return [...seen]
  }, [list])

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 flex flex-col gap-1">
        <span className="text-sm font-semibold">Cover card</span>
        <span className="text-xs text-paper-dim">
          {value ? 'Shown wherever the deck appears.' : 'Automatic: your most-played Pokémon. Pick any card instead.'}
        </span>
      </legend>
      {printings.length === 0 ? (
        <p className="text-sm text-paper-dim">Paste your list to pick a cover from its cards.</p>
      ) : (
        <div className="grid max-h-80 grid-cols-4 gap-3 overflow-y-auto p-1 sm:grid-cols-6">
          {printings.map(([key, card]) => (
            <label
              key={key}
              className="cursor-pointer rounded-[8%] outline-offset-2 transition-transform duration-200 ease-out-expo has-checked:outline-2 has-checked:outline-orange has-focus-visible:outline-2 has-focus-visible:outline-paper active:scale-95"
            >
              <input
                type="radio"
                name="coverCard"
                value={key}
                checked={value === key}
                onChange={() => onChange(key)}
                // Clicking the chosen cover again goes back to the automatic one.
                onClick={() => value === key && onChange(null)}
                className="sr-only"
                aria-label={`${card.name} ${key}`}
              />
              <CardThumb card={card} image={cardImages[key]} className="[&_figcaption]:hidden" />
            </label>
          ))}
        </div>
      )}
    </fieldset>
  )
}
