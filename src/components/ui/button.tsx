import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '#/lib/utils.ts'

export const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold',
    'transition-[background-color,color,border-color,box-shadow,translate,scale] duration-150 ease-out',
    'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 data-disabled:pointer-events-none data-disabled:opacity-45',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default:
          'bg-orange text-on-orange shadow-[0_6px_16px_-8px_rgb(0_0_0/0.8)] hover:bg-orange-hot disabled:bg-surface-raised disabled:text-paper-dim disabled:opacity-100 disabled:shadow-none data-disabled:bg-surface-raised data-disabled:text-paper-dim data-disabled:opacity-100 data-disabled:shadow-none',
        secondary:
          'bg-surface-raised text-paper hover:bg-[color-mix(in_oklab,var(--surface-raised)_80%,var(--paper)_8%)]',
        outline: 'border border-line-strong bg-transparent text-paper hover:border-orange hover:text-orange',
        ghost: 'text-paper-dim hover:bg-surface-raised hover:text-paper',
        destructive: 'bg-loss text-ink hover:brightness-110',
        link: 'h-auto px-0 text-orange underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        default: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-lg tracking-tight',
        icon: 'size-10',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export type ButtonProps = ComponentProps<typeof ButtonPrimitive> & VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
