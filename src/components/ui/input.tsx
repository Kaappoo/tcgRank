import { Input as InputPrimitive } from '@base-ui/react/input'
import type { ComponentProps } from 'react'
import { cn } from '#/lib/utils.ts'

export const inputClassName = cn(
  'h-11 w-full min-w-0 rounded-md border border-input bg-ink/60 px-3.5 text-base text-paper md:text-sm',
  'placeholder:text-paper-dim/80 transition-[border-color,box-shadow] duration-150',
  'focus-visible:border-orange focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange/20',
  'aria-invalid:border-loss aria-invalid:ring-loss/20 data-invalid:border-loss',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'file:border-0 file:bg-transparent file:text-sm file:font-medium',
)

export function Input({ className, ...props }: ComponentProps<typeof InputPrimitive>) {
  return <InputPrimitive data-slot="input" className={cn(inputClassName, className)} {...props} />
}
