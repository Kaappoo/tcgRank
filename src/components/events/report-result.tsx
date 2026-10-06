import { Check, Clock3, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import type { MatchView } from '#/server/events/views.ts'
import { cn } from '#/lib/utils.ts'
import { describeResult, RESULT_OPTIONS, toGames, type ResultOption } from './result-options.ts'

export interface ReportResultProps {
  readonly match: MatchView
  readonly viewerId: string
  readonly isPending?: boolean
  readonly onReport: (games: { player1Games: number; player2Games: number }) => void
  readonly onConfirm: () => void
}

const toneClass: Record<ResultOption['tone'], string> = {
  win: 'data-[selected=true]:border-win data-[selected=true]:bg-win/12 data-[selected=true]:text-win',
  draw: 'data-[selected=true]:border-draw data-[selected=true]:bg-draw/12 data-[selected=true]:text-draw',
  loss: 'data-[selected=true]:border-loss data-[selected=true]:bg-loss/12 data-[selected=true]:text-loss',
}

/** Result reporting at the table: pick the score, submit, and the opponent confirms. */
export function ReportResult({ match, viewerId, isPending, onReport, onConfirm }: ReportResultProps) {
  const [choice, setChoice] = useState<ResultOption | null>(null)
  const [editing, setEditing] = useState(false)
  const current = describeResult(match, viewerId)
  const reportedByMe = match.reportedById === viewerId

  if (match.status === 'confirmed' && current) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface p-5">
        <div>
          <p className="text-sm text-paper-dim">Final result</p>
          <p className="font-display text-2xl">{current.text}</p>
        </div>
        <Badge variant={current.tone}>
          <Check /> Confirmed
        </Badge>
      </div>
    )
  }

  if (match.status === 'reported' && current && !editing) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-orange/40 bg-orange/[0.06] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-paper-dim">{reportedByMe ? 'You reported' : 'Your opponent reported'}</p>
            <p className="font-display text-2xl">{current.text}</p>
          </div>
          <Badge variant="live">
            <Clock3 /> {reportedByMe ? 'Awaiting opponent' : 'Needs you'}
          </Badge>
        </div>
        {reportedByMe ? (
          <p className="text-sm text-paper-dim">
            Ask your opponent to confirm on their phone, or change it if you slipped.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {!reportedByMe ? (
            <Button size="lg" className="flex-1" disabled={isPending} onClick={onConfirm}>
              <Check /> That&apos;s right — confirm
            </Button>
          ) : null}
          <Button size="lg" variant="outline" disabled={isPending} onClick={() => setEditing(true)}>
            <RotateCcw /> {reportedByMe ? 'Change' : 'Report different score'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form
      className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (!choice) return
        onReport(toGames(match, viewerId, choice))
        setEditing(false)
      }}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-display text-xl">Report your match</h3>
        <span className="text-xs text-paper-dim">Best of three</span>
      </div>
      <div role="radiogroup" aria-label="Match result" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {RESULT_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={choice?.id === option.id}
            data-selected={choice?.id === option.id}
            onClick={() => setChoice(option)}
            className={cn(
              'min-h-12 cursor-pointer rounded-lg border border-line-strong px-3 py-2 text-left text-sm font-semibold transition-[background-color,border-color,color,scale] duration-150 active:scale-[0.97] hover:border-paper-dim',
              toneClass[option.tone],
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="lg" className="flex-1" disabled={!choice || isPending}>
          {isPending ? 'Sending…' : 'Submit result'}
        </Button>
        {editing ? (
          <Button type="button" size="lg" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  )
}
