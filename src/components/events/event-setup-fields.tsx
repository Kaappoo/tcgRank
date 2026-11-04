import { PairingSystemField } from '#/components/forms/pairing-system-field.tsx'
import { SettingSwitch } from '#/components/forms/setting-switch.tsx'
import { Field, FieldDescription, FieldError, FieldLabel } from '#/components/ui/field.tsx'
import { Input } from '#/components/ui/input.tsx'
import type { PairingSystem } from '#/domain/event-setup.ts'
import { recommendedRounds } from '#/domain/swiss.ts'

/** The part of the Host an event form that decides how rounds are built. */
export interface SetupDraft {
  readonly pairingSystem: PairingSystem
  readonly topCut: boolean
  /** Swiss only; 0 picks by attendance. */
  readonly plannedRounds: number
}

const RULE_HINTS: Record<Exclude<PairingSystem, 'swiss'>, string> = {
  round_robin: 'Everyone plays everyone: N−1 rounds (N with an odd number of players).',
  single_elimination: 'Rounds follow the bracket size: 3 rounds for 8 players, 4 for 16.',
}

/** Pairing system, the Top cut switch and the round count (Swiss only). Leaving Swiss resets the other two. */
export function EventSetupFields({
  value,
  onChange,
  roundsError,
}: {
  value: SetupDraft
  onChange: (draft: SetupDraft) => void
  roundsError?: string
}) {
  const { pairingSystem, topCut, plannedRounds } = value
  return (
    <div className="flex flex-col gap-6">
      <PairingSystemField
        value={pairingSystem}
        onChange={(next) =>
          onChange(
            next === 'swiss'
              ? { ...value, pairingSystem: next }
              : { pairingSystem: next, topCut: false, plannedRounds: 0 },
          )
        }
      />
      {pairingSystem === 'swiss' ? (
        <div className="grid gap-6 sm:grid-cols-2">
          <Field invalid={Boolean(roundsError)}>
            <FieldLabel>Swiss rounds</FieldLabel>
            <Input
              name="plannedRounds"
              type="number"
              min={0}
              max={12}
              inputMode="numeric"
              value={plannedRounds}
              onChange={(e) => onChange({ ...value, plannedRounds: Number(e.target.value) })}
            />
            <FieldDescription>
              Leave at 0 and we&apos;ll pick by attendance — e.g. {recommendedRounds(8, { topCut })} rounds for 8
              players, {recommendedRounds(16, { topCut })} for 16.
            </FieldDescription>
            <FieldError>{roundsError}</FieldError>
          </Field>
          <SettingSwitch
            title="Top cut"
            description="After the Swiss rounds, the best players play a single-elimination bracket, as at a League Cup."
            checked={topCut}
            onChange={(on) => onChange({ ...value, topCut: on })}
          />
        </div>
      ) : (
        <p className="text-sm text-paper-dim">{RULE_HINTS[pairingSystem]}</p>
      )}
    </div>
  )
}
