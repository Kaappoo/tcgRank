import { Field as FieldPrimitive } from '@base-ui/react/field'
import type { ComponentProps } from 'react'
import { cn } from '#/lib/utils.ts'
import { inputClassName } from './input.tsx'

/** Native textarea registered as the Field control, so FieldLabel/description wire up automatically. */
export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <FieldPrimitive.Control
      data-slot="textarea"
      render={
        <textarea
          {...props}
          className={cn(inputClassName, 'h-auto min-h-28 py-3 leading-relaxed field-sizing-content', className)}
        />
      }
    />
  )
}
