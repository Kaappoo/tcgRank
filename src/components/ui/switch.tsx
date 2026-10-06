import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import type { ComponentProps } from 'react'
import { cn } from '#/lib/utils.ts'

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-line-strong bg-surface-raised p-0.5 transition-colors duration-200',
        'data-checked:border-orange data-checked:bg-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-4.5 rounded-full bg-paper shadow-sm transition-transform duration-200 ease-out-expo data-checked:translate-x-5 data-checked:bg-on-orange" />
    </SwitchPrimitive.Root>
  )
}
