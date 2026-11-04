import { PAIRING_SYSTEMS, type PairingSystem } from '#/domain/event-setup.ts'
import { pairingSystemLabel } from '#/lib/format.ts'
import { ToggleChip } from '#/components/ui/toggle-chip.tsx'

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
          <ToggleChip
            key={system}
            pressed={value === system}
            onClick={() => onChange(system)}
          >
            {pairingSystemLabel(system)}
          </ToggleChip>
        ))}
      </div>
      <p className="text-xs text-paper-dim">{DESCRIPTIONS[value]}</p>
    </fieldset>
  )
}
