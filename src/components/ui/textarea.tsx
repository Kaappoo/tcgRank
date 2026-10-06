import type { ComponentProps } from 'react'
import { cn } from '#/lib/utils.ts'
import { inputClassName } from './input.tsx'

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(inputClassName, 'h-auto min-h-28 py-3 leading-relaxed field-sizing-content', className)}
      {...props}
    />
  )
}
