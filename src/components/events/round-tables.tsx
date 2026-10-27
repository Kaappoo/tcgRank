import { Check, Clock3, PencilLine } from 'lucide-react'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Dialog, DialogContent } from '#/components/ui/dialog.tsx'
import { scoreRules, type BestOf } from '#/domain/best-of.ts'
import type { MatchView } from '#/server/events/views.ts'
import { cn } from '#/lib/utils.ts'
import { useState } from 'react'
import { ScoreStepper } from './score-stepper.tsx'

const statusBadge = (m: MatchView) =>
  m.status === 'confirmed' ? (
    <Badge variant="muted">
      <Check /> Final
    </Badge>
  ) : m.status === 'reported' ? (
    <Badge variant="live">
      <Clock3 /> Confirming
    </Badge>
  ) : (
    <Badge variant="outline">Playing</Badge>
  )

const score = (m: MatchView) => (m.outcome && m.outcome !== 'bye' ? `${m.player1Games}–${m.player2Games}` : null)

/** A match with an opponent: byes are scored automatically, so only these can be corrected. */
type PlayedMatch = MatchView & { readonly player2: NonNullable<MatchView['player2']> }
const isPlayed = (m: MatchView): m is PlayedMatch => m.player2 !== null

/** Every table in a round. Hosts get a correction control on each played table. */
export function RoundTables({
  matches,
  bestOf,
  viewerId,
  canEdit,
  onSetResult,
  correction,
}: {
  matches: ReadonlyArray<MatchView>
  /** The event's best of: bounds the host's correction steppers. */
  bestOf: BestOf
  viewerId?: string | null
  canEdit?: boolean
  /** Sends the host's correction; call `saved` once it is stored to close the dialog. */
  onSetResult?: (matchId: string, player1Games: number, player2Games: number, saved: () => void) => void
  /** State of the correction being sent: the dialog stays open while pending and shows a refusal. */
  correction?: { readonly isPending: boolean; readonly error: string | null }
}) {
  const [editing, setEditing] = useState<PlayedMatch | null>(null)
  // Only a refusal of a correction sent from this dialog belongs in it, not one from an earlier opening.
  const [sent, setSent] = useState(false)
  const edit = (m: PlayedMatch | null) => {
    setSent(false)
    setEditing(m)
  }

  return (
    <>
      <ul className="stagger grid gap-2">
        {matches.map((m, index) => {
          const mine = viewerId && (m.player1.id === viewerId || m.player2?.id === viewerId)
          return (
            <li
              key={m.id}
              style={{ ['--i' as string]: index }}
              className={cn(
                'grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3',
                mine && 'border-orange/50',
              )}
            >
              <span className="font-numerals text-3xl text-paper-dim">{m.table}</span>
              <div className="grid min-w-0 gap-0.5 text-sm sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-3">
                <span className={cn('truncate font-semibold', m.outcome === 'p1' && 'text-win')}>{m.player1.name}</span>
                <span className="tabular hidden text-center text-paper-dim sm:block">{score(m) ?? 'vs'}</span>
                <span
                  className={cn(
                    'truncate font-semibold',
                    m.outcome === 'p2' && 'text-win',
                    !m.player2 && 'text-paper-dim',
                  )}
                >
                  {m.player2?.name ?? 'Bye'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(m)}
                {canEdit && isPlayed(m) ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Set result for table ${m.table}`}
                    onClick={() => edit(m)}
                  >
                    <PencilLine />
                  </Button>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && edit(null)}>
        {editing ? (
          <DialogContent
            title={`Table ${editing.table}`}
            description="Host results are final immediately and override what players reported."
          >
            <ScoreStepper
              rules={scoreRules(bestOf)}
              sides={{ kind: 'players', player1: editing.player1.name, player2: editing.player2.name }}
              initial={[editing.player1Games, editing.player2Games]}
              isPending={correction?.isPending}
              error={sent ? correction?.error : null}
              onSend={([p1, p2]) => {
                setSent(true)
                onSetResult?.(editing.id, p1, p2, () => edit(null))
              }}
              onCancel={() => edit(null)}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  )
}
