import { Separator as SeparatorPrimitive } from '@base-ui/react/separator'
import type { ComponentProps } from 'react'
import { cn } from '#/lib/utils.ts'

export function Separator({
  className,
  orientation = 'horizontal',
  ...props
}: ComponentProps<typeof SeparatorPrimitive>) {
  return (
    <SeparatorPrimitive
      orientation={orientation}
      className={cn('shrink-0 bg-line', orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', className)}
      {...props}
    />
  )
}
