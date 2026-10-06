import { cn } from '#/lib/utils.ts'

/** Wordmark: a tilted orange slab carrying the "R" of Rank. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-display text-lg leading-none', className)}>
      <span
        aria-hidden
        className="relative inline-flex h-7 w-6 -skew-x-12 items-center justify-center rounded-[3px] bg-orange text-on-orange"
      >
        <span className="skew-x-12 text-sm">R</span>
      </span>
      <span>
        tcg<span className="text-orange">Rank</span>
      </span>
    </span>
  )
}
