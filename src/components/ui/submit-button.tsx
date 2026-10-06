import { useHydrated } from '#/hooks/use-hydrated.ts'
import { Button, type ButtonProps } from './button.tsx'

/**
 * Submit button that stays disabled until React has hydrated, so a quick tap
 * on a slow store connection never falls back to a native GET form submit.
 */
export function SubmitButton({ disabled, ...props }: Omit<ButtonProps, 'type'>) {
  const hydrated = useHydrated()
  return <Button type="submit" disabled={!hydrated || disabled} {...props} />
}
