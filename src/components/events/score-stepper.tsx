import { Minus, Plus, TriangleAlert } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { Button } from '#/components/ui/button.tsx'
import { SubmitButton } from '#/components/ui/submit-button.tsx'
import { invalidScoreReason, isCompleteScore, stepperMax, type ScoreRules } from '#/domain/best-of.ts'
import { cn } from '#/lib/utils.ts'
import { describeScore, type ResultText, type ResultTone } from './result-options.ts'

/** Two games counts, in the order of the sides: [mine, theirs] or [player 1, player 2]. */
export type Score = readonly [number, number]

/** Who the two steppers belong to: the reporting player and their opponent, or two named players. */
export type ScoreSides =
  | { readonly kind: 'mine' }
  | { readonly kind: 'players'; readonly player1: string; readonly player2: string }

export interface ScoreStepperProps {
  readonly rules: ScoreRules
  readonly sides: ScoreSides
  readonly initial: Score
  readonly onSend: (score: Score) => void
  readonly isPending?: boolean
  /** Why the last send was refused, shown under the score. */
  readonly error?: string | null
  /** The pending report, in side order: sending the same score confirms it, so it skips the incomplete warning. */
  readonly agreesWith?: Score
  /** Shows a Cancel button next to send. */
  readonly onCancel?: () => void
}

const labelsFor = (sides: ScoreSides): readonly [string, string] =>
  sides.kind === 'mine' ? ['My games', 'Their games'] : [sides.player1, sides.player2]

const meaning = (sides: ScoreSides, [a, b]: Score): ResultText => {
  if (sides.kind === 'mine' || a === b) return describeScore(a, b)
  return a > b
    ? { text: `${sides.player1} wins ${a}–${b}`, tone: 'win' }
    : { text: `${sides.player2} wins ${b}–${a}`, tone: 'win' }
}

const toneText: Record<ResultTone, string> = { win: 'text-win', draw: 'text-draw', loss: 'text-loss' }

const focusOnMount = (element: HTMLElement | null) => element?.focus()

/**
 * Best-of score entry: one stepper per side, bounded by the score rules, the result the score
 * means, and a send button. An incomplete report (nobody reached the majority) asks once more.
 */
export function ScoreStepper({
  rules,
  sides,
  initial,
  onSend,
  isPending,
  error,
  agreesWith,
  onCancel,
}: ScoreStepperProps) {
  const [score, setScore] = useState<Score>(initial)
  const [confirmIncomplete, setConfirmIncomplete] = useState(false)
  const labels = labelsFor(sides)
  const invalid = invalidScoreReason(rules, score[0], score[1])
  const agrees = agreesWith !== undefined && agreesWith[0] === score[0] && agreesWith[1] === score[1]
  const complete = agrees || isCompleteScore(rules, score[0], score[1])
  const result = meaning(sides, score)

  const set = (side: 0 | 1, games: number) => {
    setConfirmIncomplete(false)
    setScore(side === 0 ? [games, score[1]] : [score[0], games])
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (invalid) return
        if (!complete && !confirmIncomplete) {
          setConfirmIncomplete(true)
          return
        }
        onSend(score)
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        {([0, 1] as const).map((side) => (
          <Stepper
            key={side}
            label={labels[side]}
            value={score[side]}
            max={stepperMax(rules, score[side === 0 ? 1 : 0])}
            onChange={(games) => set(side, games)}
          />
        ))}
      </div>

      <p role="status" className={cn('font-display text-2xl', toneText[result.tone])}>
        {result.text}
      </p>

      {invalid ? <p className="text-sm text-loss">{invalid}</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-loss">
          {error}
        </p>
      ) : null}

      {confirmIncomplete ? (
        <div className="flex flex-col gap-3 rounded-lg border border-draw/40 bg-draw/[0.06] p-4">
          <p role="alert" className="flex items-center gap-2 text-sm font-semibold text-draw">
            <TriangleAlert className="size-4" aria-hidden /> Not all games reported. Send anyway?
          </p>
          <div className="flex gap-2">
            {/* Focus lands on the answer to the question, so keyboard and screen reader users aren't stranded. */}
            <SubmitButton ref={focusOnMount} size="lg" className="flex-1" disabled={isPending}>
              {isPending ? 'Sending…' : 'Send anyway'}
            </SubmitButton>
            <Button type="button" size="lg" variant="ghost" onClick={() => setConfirmIncomplete(false)}>
              Keep editing
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <SubmitButton size="lg" className="flex-1" disabled={Boolean(invalid) || isPending}>
            {isPending ? 'Sending…' : 'Send result'}
          </SubmitButton>
          {onCancel ? (
            <Button type="button" size="lg" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
        </div>
      )}
    </form>
  )
}

function Stepper({
  label,
  value,
  max,
  onChange,
}: {
  label: string
  value: number
  max: number
  onChange: (games: number) => void
}) {
  const step = (by: number) => {
    const next = Math.min(max, Math.max(0, value + by))
    if (next !== value) onChange(next)
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') step(1)
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') step(-1)
    else if (e.key === 'Home') onChange(0)
    else if (e.key === 'End') onChange(max)
    else return
    e.preventDefault()
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line-strong bg-surface-raised/40 p-3">
      <span className="truncate text-sm text-paper-dim">{label}</span>
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-12"
          aria-label={`Remove a game: ${label}`}
          disabled={value <= 0}
          focusableWhenDisabled
          onClick={() => step(-1)}
        >
          <Minus className="size-5" />
        </Button>
        <div
          role="spinbutton"
          tabIndex={0}
          aria-label={label}
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          onKeyDown={onKeyDown}
          className="font-numerals min-w-10 rounded-md text-center text-5xl leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
        >
          {value}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-12"
          aria-label={`Add a game: ${label}`}
          disabled={value >= max}
          focusableWhenDisabled
          onClick={() => step(1)}
        >
          <Plus className="size-5" />
        </Button>
      </div>
    </div>
  )
}
