import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '#/lib/utils.ts'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs leading-none font-semibold [&_svg]:size-3.5',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-orange text-on-orange',
        outline: 'border-line-strong text-paper-dim',
        live: 'border-orange/50 bg-orange/12 text-orange',
        win: 'border-transparent bg-win/15 text-win',
        loss: 'border-transparent bg-loss/15 text-loss',
        draw: 'border-transparent bg-draw/15 text-draw',
        muted: 'border-transparent bg-surface-raised text-paper-dim',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export function Badge({ className, variant, ...props }: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

/** Pulsing dot for anything happening right now. */
export function LiveDot({ className }: { className?: string }) {
  return <span aria-hidden className={cn('size-2 rounded-full bg-orange animate-live', className)} />
}
