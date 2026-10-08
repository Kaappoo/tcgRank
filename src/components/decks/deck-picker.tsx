import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { deckIneligibility } from '#/domain/registration.ts'
import { formatLabel } from '#/lib/format.ts'
import { cn } from '#/lib/utils.ts'
import type { EventFormat } from '#/server/db/schema.ts'
import type { DeckView } from '#/server/decks/service.ts'
import { DeckCover } from './deck-cover.tsx'

/** The picker's value when the player chose to enter without a deck. */
export const SKIP_DECK = 'skip'

export interface DeckPickerProps {
  /** The player's decks; undefined while they load. */
  readonly decks: ReadonlyArray<DeckView> | undefined
  readonly eventFormat: EventFormat
  /** Required events only accept eligible decks and offer no skip. */
  readonly required: boolean
  /** A deck id, `SKIP_DECK`, or null before the player has chosen. */
  readonly value: string | null
  readonly onChange: (value: string) => void
  /** Join code of the event, so a deck created from here comes back to it. */
  readonly joinCode: string
  readonly disabled?: boolean
}

const tile =
  'relative flex cursor-pointer flex-col gap-2 rounded-xl border border-line bg-surface p-2.5 text-left transition-[border-color,background-color,transform] duration-200 ease-out-expo hover:border-paper-dim has-checked:border-orange has-checked:bg-orange/[0.08] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-orange has-disabled:cursor-not-allowed has-disabled:opacity-50 has-disabled:hover:border-line active:scale-[0.98]'

/** Choose the deck to register at an event: one of your decks, a new one, or (when allowed) none. */
export function DeckPicker({ decks, eventFormat, required, value, onChange, joinCode, disabled }: DeckPickerProps) {
  return (
    <fieldset disabled={disabled} className="flex flex-col gap-3">
      <legend className="mb-3 flex flex-col gap-1">
        <span className="font-semibold">Deck you&apos;re playing</span>
        <span className="text-sm text-paper-dim">
          {required
            ? `This event requires a registered deck: 60 cards, ${formatLabel(eventFormat)}.`
            : 'Only you and the host see it until the event ends.'}
        </span>
      </legend>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {(decks ?? []).map((deck) => {
          const ineligible = required ? deckIneligibility(deck, eventFormat) : null
          return (
            <label key={deck.id} className={tile}>
              <input
                type="radio"
                name="deck"
                value={deck.id}
                checked={value === deck.id}
                disabled={ineligible !== null}
                onChange={() => onChange(deck.id)}
                className="sr-only"
              />
              <DeckCover deck={deck} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold">{deck.name}</span>
                <span className={cn('text-xs', ineligible ? 'text-loss' : 'text-paper-dim')}>
                  {ineligible ?? `${formatLabel(deck.format)} · ${deck.cardCount} cards`}
                </span>
              </span>
            </label>
          )
        })}
        <Link
          to="/decks/new"
          search={{ joinCode }}
          className={cn(
            tile,
            'items-center justify-center border-dashed text-sm font-semibold text-paper-dim hover:text-paper',
          )}
        >
          <span className="flex aspect-[63/88] w-full flex-col items-center justify-center gap-2">
            <Plus className="size-6" />
            New deck
          </span>
        </Link>
      </div>
      {decks?.length === 0 ? (
        <p className="text-sm text-paper-dim">You have no decks yet. Paste a list and you&apos;ll come right back.</p>
      ) : null}
      {!required ? (
        <label className={cn(tile, 'flex-row items-center px-4 py-3 text-sm font-semibold')}>
          <input
            type="radio"
            name="deck"
            value={SKIP_DECK}
            checked={value === SKIP_DECK}
            onChange={() => onChange(SKIP_DECK)}
            className="sr-only"
          />
          Skip — enter without a deck
        </label>
      ) : null}
    </fieldset>
  )
}
