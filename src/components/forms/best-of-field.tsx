import { BEST_OF_VALUES, majority, type BestOf } from '#/domain/best-of.ts'
import { bestOfLabel } from '#/lib/format.ts'
import { ToggleChip } from '#/components/ui/toggle-chip.tsx'

/** Segmented choice of an event's best-of (1, 3 or 5 games). */
export function BestOfField({
  value,
  onChange,
  disabled,
  hint,
}: {
  value: BestOf
  onChange: (bestOf: BestOf) => void
  disabled?: boolean
  /** Replaces the default "Winning 2 of 3 wins the match." line, e.g. to say why it is locked. */
  hint?: string
}) {
  return (
    <fieldset className="flex flex-col gap-3" disabled={disabled}>
      <legend className="mb-3 text-sm font-semibold">Best of</legend>
      <div className="flex flex-wrap items-center gap-2">
        {BEST_OF_VALUES.map((n) => (
          <ToggleChip
            key={n}
            pressed={value === n}
            aria-label={bestOfLabel(n)}
            onClick={() => onChange(n)}
          >
            <span className="tabular">{n}</span> {n === 1 ? 'game' : 'games'}
          </ToggleChip>
        ))}
      </div>
      <p className="text-xs text-paper-dim">
        {hint ??
          (value === 1
            ? 'One game decides the match.'
            : `The most games a match can have. Winning ${majority(value)} of ${value} wins the match.`)}
      </p>
    </fieldset>
  )
}
