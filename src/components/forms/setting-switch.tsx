import { useId } from 'react'
import { Switch } from '#/components/ui/switch.tsx'

/** An on/off setting in a bordered row: the title names the switch, the line below describes it. */
export function SettingSwitch({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (on: boolean) => void
  disabled?: boolean
}) {
  const id = useId()
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border border-line px-4 py-3">
      <span className="flex flex-col">
        <span id={`${id}-title`} className="text-sm font-semibold">
          {title}
        </span>
        <span id={`${id}-description`} className="text-xs text-paper-dim">
          {description}
        </span>
      </span>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={(on) => onChange(on)}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
      />
    </label>
  )
}
