import { useState, type ComponentProps } from 'react'
import type { EventDetail } from '#/server/events/views.ts'
import { BracketPath } from './bracket-path.tsx'
import { RoundTables } from './round-tables.tsx'

type TablesProps = Pick<ComponentProps<typeof RoundTables>, 'canEdit' | 'onSetResult' | 'correction'>

/**
 * The Pairings tab: a Swiss or round-robin round as its list of tables, chosen
 * with round chips; once a bracket starts (round 1 of single elimination, or
 * the first round of a top cut) every elimination round shows together as the
 * bracket view, behind one "Top cut" chip after the Swiss rounds.
 */
export function PairingsPanel({
  detail,
  viewerId,
  ...tables
}: { detail: Pick<EventDetail, 'event' | 'rounds' | 'matches' | 'players'>; viewerId?: string | null } & TablesProps) {
  const { event, rounds, matches } = detail
  // A choice made in an earlier round lapses when the next round is paired, so the new pairings show.
  const [chosen, setChosen] = useState<{ readonly during: number; readonly round: number } | null>(null)
  const shownRound = chosen?.during === event.currentRound ? chosen.round : event.currentRound
  const shown = rounds.find((r) => r.number === shownRound)
  const firstElimination = rounds.find((r) => r.elimination)
  const chips = [
    ...rounds.filter((r) => !r.elimination).map((r) => ({ number: r.number, label: `Round ${r.number}` })),
    ...(firstElimination ? [{ number: firstElimination.number, label: 'Top cut' }] : []),
  ]
  const inBracket = shown?.elimination ?? false

  return (
    <>
      {chips.length > 1 ? (
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Choose round">
          {chips.map((chip) => (
            <button
              key={chip.number}
              type="button"
              aria-pressed={inBracket ? chip.number === firstElimination?.number : chip.number === shownRound}
              onClick={() => setChosen({ during: event.currentRound, round: chip.number })}
              className="h-9 cursor-pointer rounded-full border border-line-strong px-4 text-sm font-semibold transition-colors aria-pressed:border-orange aria-pressed:bg-orange aria-pressed:text-on-orange"
            >
              {chip.label}
            </button>
          ))}
        </div>
      ) : null}
      {inBracket ? (
        <BracketPath detail={detail} viewerId={viewerId} {...tables} />
      ) : (
        <RoundTables
          matches={matches.filter((m) => m.roundNumber === shownRound)}
          bestOf={event.bestOf}
          viewerId={viewerId}
          {...tables}
        />
      )}
    </>
  )
}
