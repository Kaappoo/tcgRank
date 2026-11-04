import type { ComponentProps } from 'react'
import { cn } from '#/lib/utils.ts'

/**
 * A pressable choice in a group (segmented pickers, round chips): orange while pressed. `segment` is the tall,
 * squared option of a form field; `pill` the shorter, rounded chip of a filter row.
 */
export function ToggleChip({
  pressed,
  shape = 'segment',
  className,
  ...props
}: Omit<ComponentProps<'button'>, 'type' | 'aria-pressed'> & {
  readonly pressed: boolean
  readonly shape?: 'segment' | 'pill'
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        'cursor-pointer border border-line-strong px-4 text-sm font-semibold transition-colors hover:border-paper-dim disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:border-orange aria-pressed:bg-orange aria-pressed:text-on-orange',
        shape === 'segment' ? 'h-11 rounded-lg' : 'h-9 rounded-full',
        className,
      )}
      {...props}
    />
  )
}
