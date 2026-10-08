import { AlertTriangle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cardArtKey, parseDeckList, type DeckCard, type DeckSection } from '#/domain/deck-list.ts'
import { cn } from '#/lib/utils.ts'
import { CardThumb } from './card-thumb.tsx'

/** Same name can appear twice from different printings, so include set and number. */
const cardKey = (card: DeckCard) => `${card.section}:${card.name}:${card.setCode}:${card.number}`

const SECTION_LABELS: Record<DeckSection, string> = { pokemon: 'Pokémon', trainer: 'Trainer', energy: 'Energy' }

const NO_IMAGES: Readonly<Record<string, string>> = {}

/**
 * Renders a PTCG Live list as sections, as text rows or as a card-image grid.
 * `cardImages` is the deck's stored art (see `cardArtKey`); cards without art show placeholders.
 */
export function DeckListView({
  list,
  cardImages = NO_IMAGES,
  defaultMode = 'list',
}: {
  list: string
  cardImages?: Readonly<Record<string, string>>
  defaultMode?: 'list' | 'visual'
}) {
  const deck = useMemo(() => parseDeckList(list), [list])
  const [mode, setMode] = useState(defaultMode)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-baseline gap-4 text-sm text-paper-dim">
          <span>
            <span className={cn('font-numerals text-3xl', deck.isLegalSize ? 'text-paper' : 'text-loss')}>
              {deck.total}
            </span>{' '}
            cards
          </span>
          {(Object.keys(SECTION_LABELS) as Array<DeckSection>).map((s) => (
            <span key={s}>
              <span className="tabular font-semibold text-paper">{deck.counts[s]}</span> {SECTION_LABELS[s]}
            </span>
          ))}
        </p>
        <div role="group" aria-label="View mode" className="flex rounded-lg border border-line p-0.5">
          {(['list', 'visual'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className="h-8 cursor-pointer rounded-md px-3 text-xs font-semibold capitalize text-paper-dim transition-colors aria-pressed:bg-surface-raised aria-pressed:text-paper"
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {deck.issues.length > 0 && deck.issues[0]?.kind !== 'empty' ? (
        <ul className="flex flex-col gap-1.5 rounded-lg border border-loss/40 bg-loss/[0.06] p-4 text-sm">
          {deck.issues.map((issue) => (
            <li key={`${issue.kind}-${issue.line}-${issue.message}`} className="flex items-start gap-2 text-paper">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-loss" />
              {issue.line ? `Line ${issue.line}: ` : ''}
              {issue.message}
            </li>
          ))}
        </ul>
      ) : null}

      {(Object.keys(SECTION_LABELS) as Array<DeckSection>).map((section) => {
        const cards = deck.cards.filter((c) => c.section === section)
        if (cards.length === 0) return null
        return (
          <section key={section} aria-label={SECTION_LABELS[section]} className="flex flex-col gap-3">
            <h3 className="flex items-baseline gap-2 border-b border-line pb-2 font-display text-lg">
              {SECTION_LABELS[section]}
              <span className="tabular text-sm font-sans font-semibold text-paper-dim">{deck.counts[section]}</span>
            </h3>
            {mode === 'list' ? (
              <ul className="grid gap-x-8 sm:grid-cols-2">
                {cards.map((card) => (
                  <li key={cardKey(card)} className="flex items-baseline gap-3 border-b border-line/50 py-1.5 text-sm">
                    <span className="font-numerals w-5 text-right text-lg text-orange">{card.count}</span>
                    <span className="flex-1 truncate">{card.name}</span>
                    {card.setCode ? (
                      <span className="tabular text-xs text-paper-dim">
                        {card.setCode} {card.number}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="grid grid-cols-3 gap-4 pt-2 pr-2 sm:grid-cols-5 lg:grid-cols-7">
                {cards.map((card) => (
                  <CardThumb key={cardKey(card)} card={card} image={cardImages[cardArtKey(card) ?? '']} />
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
