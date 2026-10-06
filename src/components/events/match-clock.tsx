import { Pause } from 'lucide-react'
import { clockPhase, formatClock, remainingMs, URGENT_THRESHOLD_MS } from '#/domain/match-clock.ts'
import { useNow } from '#/hooks/use-now.ts'
import { cn } from '#/lib/utils.ts'

export interface MatchClockProps {
  readonly endsAt: number | null
  readonly pausedRemainingMs: number | null
  readonly roundMinutes: number
  /** serverNow − clientNow, so every phone shows the same second. */
  readonly offsetMs?: number
  /** Server timestamp used for the first (hydrated) render. */
  readonly referenceNow?: number
  readonly size?: 'md' | 'lg' | 'xl'
  readonly className?: string
}

const sizes = {
  md: 'text-6xl',
  lg: 'text-8xl sm:text-9xl',
  xl: 'text-[min(28vw,18rem)] leading-[0.8]',
}

export function MatchClock({
  endsAt,
  pausedRemainingMs,
  roundMinutes,
  offsetMs = 0,
  referenceNow = 0,
  size = 'lg',
  className,
}: MatchClockProps) {
  const clock = { endsAt, pausedRemainingMs }
  const tick = useNow(endsAt !== null)
  const now = tick === null ? referenceNow : tick + offsetMs
  const phase = clockPhase(clock, now)
  const left = remainingMs(clock, now)
  const total = roundMinutes * 60_000
  const progress = Math.min(1, Math.max(0, 1 - left / total))
  const urgent = phase === 'running' && left <= URGENT_THRESHOLD_MS

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between text-xs font-semibold text-paper-dim">
        <span className="inline-flex items-center gap-2">
          {phase === 'paused' ? (
            <>
              <Pause className="size-3.5" /> Clock paused by the host
            </>
          ) : phase === 'overtime' ? (
            <span className="text-loss">Time! Finish the current turn, then 3 more turns.</span>
          ) : urgent ? (
            <span className="text-orange">Final minutes</span>
          ) : (
            'Round time remaining'
          )}
        </span>
        <span className="tabular">{roundMinutes} min round</span>
      </div>
      <p
        role="timer"
        aria-live="off"
        aria-label={`${formatClock(left)} ${phase === 'overtime' ? 'over time' : 'remaining'}`}
        className={cn(
          'font-numerals leading-none transition-colors duration-500',
          sizes[size],
          phase === 'paused' && 'text-paper-dim',
          phase === 'overtime' && 'text-loss',
          urgent && 'text-orange',
        )}
      >
        {formatClock(left)}
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-raised" aria-hidden>
        <div
          className={cn(
            'h-full origin-left rounded-full transition-[transform,background-color] duration-1000 ease-linear',
            phase === 'overtime' ? 'bg-loss' : urgent ? 'bg-orange' : 'bg-paper/80',
          )}
          style={{ transform: `scaleX(${phase === 'overtime' ? 1 : progress})` }}
        />
      </div>
    </div>
  )
}
