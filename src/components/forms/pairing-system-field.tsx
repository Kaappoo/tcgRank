import { PAIRING_SYSTEMS, type PairingSystem } from '#/domain/event-setup.ts'
import { pairingSystemLabel } from '#/lib/format.ts'

const DESCRIPTIONS: Record<PairingSystem, string> = {
  swiss: 'Players with the same record meet each round. Nobody is knocked out.',
  round_robin: 'Everyone plays everyone once. Best for small groups.',
  single_elimination: 'Lose a match and you are out. Seeds are drawn at random.',
}

/** Segmented choice of how an event builds its rounds. */
export function PairingSystemField({
  value,
  onChange,
  disabled,
}: {
  value: PairingSystem
  onChange: (pairingSystem: PairingSystem) => void
  disabled?: boolean
}) {
  return (
    <fieldset className="flex flex-col gap-3" disabled={disabled}>
      <legend className="mb-3 text-sm font-semibold">Pairing system</legend>
      <div className="flex flex-wrap items-center gap-2">
        {PAIRING_SYSTEMS.map((system) => (
          <button
            key={system}
            type="button"
            aria-pressed={value === system}
            onClick={() => onChange(system)}
            className="h-11 cursor-pointer rounded-lg border border-line-strong px-4 text-sm font-semibold transition-colors hover:border-paper-dim disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:border-orange aria-pressed:bg-orange aria-pressed:text-on-orange"
          >
            {pairingSystemLabel(system)}
          </button>
        ))}
      </div>
      <p className="text-xs text-paper-dim">{DESCRIPTIONS[value]}</p>
    </fieldset>
  )
}
