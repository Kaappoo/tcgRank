import { useMemo, type ComponentProps } from 'react'
import { cn } from '#/lib/utils.ts'
import type { EventDetail } from '#/server/events/views.ts'
import { bracketModel, pathOf, type BracketModel, type PathStep } from './bracket-model.ts'
import { RoundTables } from './round-tables.tsx'

type TablesProps = Pick<ComponentProps<typeof RoundTables>, 'canEdit' | 'onSetResult' | 'correction'>

const stepLine = (step: PathStep): { opponent: string; result: string } => {
  switch (step.kind) {
    case 'won':
    case 'lost':
      return {
        opponent: step.opponent ? `vs ${step.opponent}` : '',
        result: `${step.kind === 'won' ? 'W' : 'L'}${step.score ? ` ${step.score}` : ''}`,
      }
    case 'bye':
      return { opponent: 'No opponent', result: 'Bye' }
    case 'dropped':
      return { opponent: 'You dropped', result: 'Dropped' }
    case 'playing':
      return { opponent: `vs ${step.opponent}`, result: `Table ${step.table}` }
    case 'waiting':
      return { opponent: step.opponent ? `vs ${step.opponent}` : 'vs TBD', result: 'Waiting' }
    case 'out':
      return { opponent: '', result: 'Out' }
  }
}

/** One tile per round of the bracket: who the viewer met or meets, and how it went. */
function YourPath({ model, viewerId }: { model: BracketModel; viewerId: string }) {
  const path = pathOf(model, viewerId)
  if (!path) return null
  return (
    <section aria-label="Your path" className="rounded-xl border border-orange/50 bg-surface p-4">
      <h3 className="mb-3 font-display text-xl">Your path</h3>
      <ol className="grid auto-cols-[minmax(6.5rem,1fr)] grid-flow-col gap-2 overflow-x-auto">
        {path.map(({ round, step }) => {
          const now = step.kind === 'playing'
          const { opponent, result } = stepLine(step)
          return (
            <li
              key={round.number}
              aria-label={round.name}
              className={cn(
                'flex min-w-0 flex-col gap-1 rounded-lg border p-2.5',
                now ? 'border-orange bg-orange/12' : 'border-line',
              )}
            >
              <span className={cn('text-xs font-semibold', now ? 'text-orange' : 'text-paper-dim')}>{round.name}</span>
              <span className="min-h-5 truncate text-sm font-semibold">{opponent}</span>
              <span
                className={cn(
                  'font-numerals text-lg',
                  step.kind === 'won'
                    ? 'text-win'
                    : step.kind === 'lost'
                      ? 'text-loss'
                      : now
                        ? 'text-orange'
                        : 'text-paper-dim',
                )}
              >
                {result}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/**
 * The Pairings tab once a bracket is under way: the viewer's path first, then
 * every elimination round paired so far as the usual match list, newest first.
 */
export function BracketPath({
  detail,
  viewerId,
  ...tables
}: { detail: Pick<EventDetail, 'event' | 'rounds' | 'matches' | 'players'>; viewerId?: string | null } & TablesProps) {
  const model = useMemo(() => bracketModel(detail), [detail])
  if (!model) return null
  const played = model.rounds.filter((r) => r.paired).reverse()
  return (
    <div className="flex flex-col gap-6">
      {viewerId ? <YourPath model={model} viewerId={viewerId} /> : null}
      {played.map((round) => (
        <section key={round.number} aria-label={round.name} className="flex flex-col gap-2">
          <h3 className={cn('font-semibold', round.number === model.current ? 'text-orange' : 'text-paper-dim')}>
            {round.name}
          </h3>
          <RoundTables
            matches={detail.matches.filter((m) => m.roundNumber === round.number)}
            bestOf={detail.event.bestOf}
            elimination
            viewerId={viewerId}
            {...tables}
          />
        </section>
      ))}
    </div>
  )
}
