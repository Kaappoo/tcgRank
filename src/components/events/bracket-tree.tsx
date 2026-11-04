import { Check, Clock3 } from 'lucide-react'
import { Badge } from '#/components/ui/badge.tsx'
import { cn } from '#/lib/utils.ts'
import { seatLine, type BracketBox, type BracketModel } from './bracket-model.ts'

export type BoxSize = 'sm' | 'lg' | 'xl'

export function BoxStatus({ box }: { box: BracketBox }) {
  switch (box.status) {
    case 'bye':
      return <Badge variant="muted">Bye</Badge>
    case 'dropped':
      return <Badge variant="muted">Dropped</Badge>
    case 'final':
      return (
        <Badge variant="muted">
          <Check /> Final
        </Badge>
      )
    case 'confirming':
      return (
        <Badge variant="live">
          <Clock3 /> Confirming
        </Badge>
      )
    case 'playing':
      return <Badge variant="outline">Playing</Badge>
    case 'waiting':
      return <Badge variant="outline">Up next</Badge>
  }
}

const SEAT_TEXT: Record<BoxSize, string> = { sm: 'text-sm', lg: 'text-2xl', xl: 'text-4xl' }

/** One player line in a bracket box: seed, name and games won. */
function SeatLine({ box, side, size }: { box: BracketBox; side: 'a' | 'b'; size: BoxSize }) {
  const seat = seatLine(box, side)
  return (
    <div
      className={cn(
        'grid grid-cols-[1.5em_minmax(0,1fr)_auto] items-baseline gap-2',
        SEAT_TEXT[size],
        seat.lost && 'text-paper-dim',
      )}
    >
      <span className="font-numerals tabular text-paper-dim">{seat.seed}</span>
      <span className={cn('truncate', seat.decided ? 'font-semibold' : 'text-paper-dim')}>{seat.name}</span>
      <span className={cn('font-numerals tabular', seat.won ? 'text-win' : 'text-paper-dim')}>{seat.games}</span>
    </div>
  )
}

const live = (box: BracketBox) => box.status === 'playing' || box.status === 'confirming'

/** A match of the bracket: both seats, with the table on a tab while it is being played. */
export function MatchBox({ box, size = 'sm' }: { box: BracketBox; size?: BoxSize }) {
  return (
    <div
      className={cn(
        'relative grid min-w-0 rounded-lg border bg-surface',
        size === 'sm' ? 'gap-1 px-3 py-2' : size === 'lg' ? 'gap-2 px-5 py-4' : 'gap-3 px-7 py-6',
        live(box) ? 'border-line-strong' : 'border-line',
        box.status === 'bye' && 'border-dashed',
      )}
    >
      {box.table !== null && live(box) && size === 'sm' ? (
        <span className="font-numerals absolute -top-2.5 right-3 rounded-sm bg-orange px-1.5 text-sm leading-tight text-on-orange">
          T{box.table}
        </span>
      ) : null}
      <SeatLine box={box} side="a" size={size} />
      <SeatLine box={box} side="b" size={size} />
    </div>
  )
}

/**
 * The whole bracket, read-only, left to right. Every column has the same
 * height and each match an equal share of it, so a pair's midpoint lines up
 * with the match it feeds; the connectors are borders on the pair wrapper.
 */
export function BracketTree({ model }: { model: BracketModel }) {
  return (
    <div className="flex h-full gap-6">
      {model.rounds.map((round, r) => {
        const last = r === model.rounds.length - 1
        const pairs: Array<Array<BracketBox>> = []
        for (let i = 0; i < round.boxes.length; i += last ? 1 : 2) pairs.push(round.boxes.slice(i, i + (last ? 1 : 2)))
        return (
          <div key={round.number} className="flex min-w-0 flex-1 flex-col">
            <p
              className={cn(
                'mb-3 text-sm font-semibold',
                round.number === model.current ? 'text-orange' : 'text-paper-dim',
              )}
            >
              {round.name}
            </p>
            <div className="flex flex-1 flex-col">
              {pairs.map((pair) => (
                <div key={pair[0]!.slot} className="relative flex flex-1 flex-col">
                  {pair.map((box) => (
                    <div key={box.slot} className="flex flex-1 flex-col justify-center py-1.5">
                      <MatchBox box={box} />
                    </div>
                  ))}
                  {last ? null : (
                    <>
                      <span
                        aria-hidden
                        className="absolute inset-y-1/4 -right-3 w-3 border-y border-r border-line-strong"
                      />
                      <span aria-hidden className="absolute top-1/2 -right-6 w-3 border-t border-line-strong" />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
