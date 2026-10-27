import { Check, Clock3, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { scoreRules, type BestOf } from '#/domain/best-of.ts'
import { bestOfLabel } from '#/lib/format.ts'
import type { MatchView } from '#/server/events/views.ts'
import { describeResult, myGames, toGames } from './result-options.ts'
import { ScoreStepper } from './score-stepper.tsx'

export interface ReportResultProps {
  readonly match: MatchView
  readonly viewerId: string
  readonly bestOf: BestOf
  readonly isPending?: boolean
  readonly onReport: (games: { player1Games: number; player2Games: number }) => void
  readonly onConfirm: () => void
}

/** Result reporting at the table: step in the games, send, and the opponent confirms. */
export function ReportResult({ match, viewerId, bestOf, isPending, onReport, onConfirm }: ReportResultProps) {
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
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-display text-xl">Report your match</h3>
        <span className="text-xs text-paper-dim">{bestOfLabel(bestOf)}</span>
      </div>
      <ScoreStepper
        rules={scoreRules(bestOf)}
        sides={{ kind: 'mine' }}
        initial={myGames(match, viewerId)}
        agreesWith={match.status === 'reported' && !reportedByMe ? myGames(match, viewerId) : undefined}
        isPending={isPending}
        onCancel={editing ? () => setEditing(false) : undefined}
        onSend={(score) => {
          onReport(toGames(match, viewerId, score))
          setEditing(false)
        }}
      />
    </div>
  )
}
