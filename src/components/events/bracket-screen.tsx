import { Crown } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Logo } from '#/components/layout/logo.tsx'
import { cn } from '#/lib/utils.ts'
import type { EventDetail } from '#/server/events/views.ts'
import { bracketModel, nextUp, type BracketModel } from './bracket-model.ts'
import { BoxStatus, BracketTree, MatchBox, type BoxSize } from './bracket-tree.tsx'

/** Fewer tables get bigger boxes, so a final reads across the room and a round of 16 still fits. */
const boxSize = (tables: number): BoxSize => (tables <= 2 ? 'xl' : tables <= 4 ? 'lg' : 'sm')

/** The footer line: the next round's pairings while they wait, the champion once the final is decided. */
const footerLine = (model: BracketModel): string | null => {
  const next = nextUp(model)
  if (next) return next
  const final = model.rounds.at(-1)?.boxes[0]
  const champion = final?.winner === 'a' ? final.a : final?.winner === 'b' ? final.b : null
  return champion ? `Champion: ${champion.name}` : null
}

/**
 * The store screen during a bracket: the current round's tables at full size
 * on the left, the clock, the whole bracket and the QR code on the right.
 */
export function BracketScreen({
  detail,
  clock,
  qr,
}: {
  detail: Pick<EventDetail, 'event' | 'rounds' | 'matches' | 'players' | 'progress'>
  clock: ReactNode
  qr: ReactNode
}) {
  const model = useMemo(() => bracketModel(detail), [detail])
  if (!model) return null
  const round = model.rounds.find((r) => r.number === model.current)!
  const boxes = round.boxes.filter((b) => b.match !== null)
  const size = boxSize(boxes.length)
  const footer = footerLine(model)

  return (
    <div className="fixed inset-0 z-50 grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-10 overflow-hidden bg-ink p-10">
      <section aria-labelledby="now-playing" className="flex min-h-0 flex-col gap-8">
        <div className="flex items-center gap-6">
          <Logo className="text-2xl" />
          <h1 className="truncate font-display text-4xl">{detail.event.name}</h1>
        </div>
        <div aria-label="Now playing" role="region" className="flex min-h-0 flex-col gap-6">
          <h2 id="now-playing" className="font-display text-6xl text-orange">
            {round.name}
          </h2>
          <ol className={cn('grid min-h-0 gap-6 overflow-hidden', size === 'sm' && 'grid-cols-2 gap-4')}>
            {boxes.map((box) => (
              <li
                key={box.slot}
                aria-label={box.table === null ? 'Bye' : `Table ${box.table}`}
                className={cn(
                  'grid items-center',
                  size === 'sm' ? 'grid-cols-[3rem_1fr] gap-4' : 'grid-cols-[8rem_1fr] gap-8',
                )}
              >
                <span
                  className={cn(
                    'font-numerals leading-none text-orange',
                    size === 'sm' ? 'text-5xl' : size === 'lg' ? 'text-7xl' : 'text-9xl',
                  )}
                >
                  {box.table ?? '–'}
                </span>
                <div className="flex min-w-0 flex-col items-start gap-3">
                  <div className="w-full">
                    <MatchBox box={box} size={size} />
                  </div>
                  <BoxStatus box={box} />
                </div>
              </li>
            ))}
          </ol>
        </div>
        {footer ? (
          <p className="mt-auto flex items-center gap-3 text-2xl text-paper-dim">
            <Crown className="size-7 shrink-0 text-orange" />
            <span className="truncate">{footer}</span>
          </p>
        ) : null}
      </section>
      <aside className="flex min-h-0 flex-col gap-8 border-l border-line pl-10">
        {clock}
        <section aria-label="Bracket" className="min-h-0 flex-1">
          <BracketTree model={model} />
        </section>
        <div className="flex items-center gap-6">
          <div className="size-32 shrink-0">{qr}</div>
          <p className="text-xl text-paper-dim">Scan to follow the bracket</p>
        </div>
      </aside>
    </div>
  )
}
