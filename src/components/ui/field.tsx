import { Field as FieldPrimitive } from '@base-ui/react/field'
import type { ComponentProps } from 'react'
import { cn } from '#/lib/utils.ts'

export function Field({ className, ...props }: ComponentProps<typeof FieldPrimitive.Root>) {
  return <FieldPrimitive.Root data-slot="field" className={cn('flex flex-col gap-2', className)} {...props} />
}

export function FieldLabel({ className, ...props }: ComponentProps<typeof FieldPrimitive.Label>) {
  return (
    <FieldPrimitive.Label
      data-slot="field-label"
      className={cn('text-sm font-semibold text-paper', className)}
      {...props}
    />
  )
}

export function FieldDescription({ className, ...props }: ComponentProps<typeof FieldPrimitive.Description>) {
  return (
    <FieldPrimitive.Description
      data-slot="field-description"
      className={cn('text-xs leading-relaxed text-paper-dim', className)}
      {...props}
    />
  )
}

/** Shows a message whenever one is passed, independent of native validity. */
export function FieldError({ className, children, ...props }: ComponentProps<'p'>) {
  if (!children) return null
  return (
    <p role="alert" data-slot="field-error" className={cn('text-xs font-medium text-loss', className)} {...props}>
      {children}
    </p>
  )
}
