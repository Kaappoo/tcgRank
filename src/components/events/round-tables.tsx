import { Check, Clock3, PencilLine } from 'lucide-react'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Dialog, DialogClose, DialogContent } from '#/components/ui/dialog.tsx'
import type { MatchView } from '#/server/events/views.ts'
import { cn } from '#/lib/utils.ts'
import { useState } from 'react'

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

/** Every table in a round. Hosts get a correction control on each row. */
export function RoundTables({
  matches,
  viewerId,
  canEdit,
  onSetResult,
}: {
  matches: ReadonlyArray<MatchView>
  viewerId?: string | null
  canEdit?: boolean
  onSetResult?: (matchId: string, player1Games: number, player2Games: number) => void
}) {
  const [editing, setEditing] = useState<MatchView | null>(null)

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
                {canEdit && m.player2 ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Set result for table ${m.table}`}
                    onClick={() => setEditing(m)}
                  >
                    <PencilLine />
                  </Button>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing ? (
          <DialogContent
            title={`Table ${editing.table}`}
            description="Host results are final immediately and override what players reported."
          >
            <div className="grid gap-2">
              {[
                [2, 0],
                [2, 1],
                [1, 0],
                [1, 1],
                [0, 0],
                [0, 1],
                [1, 2],
                [0, 2],
              ].map(([a, b]) => (
                <DialogClose
                  key={`${a}-${b}`}
                  render={
                    <Button
                      variant="secondary"
                      className="justify-between"
                      onClick={() => onSetResult?.(editing.id, a!, b!)}
                    />
                  }
                >
                  <span className="truncate">
                    {a! > b! ? editing.player1.name : a! < b! ? editing.player2?.name : 'Tie'}
                  </span>
                  <span className="tabular text-paper-dim">
                    {a}–{b}
                  </span>
                </DialogClose>
              ))}
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  )
}
