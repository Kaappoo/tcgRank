import { Avatar } from '#/components/ui/avatar.tsx'
import { clothingHex } from '#/domain/avatar-parts.ts'
import type { MatchView, PlayerRef } from '#/server/events/views.ts'
import { cn } from '#/lib/utils.ts'

interface Seat {
  readonly player: PlayerRef
  readonly table: number
  readonly opponent: string
  readonly done: boolean
}

/** Every player of the round, alphabetical, with their table: read from across the room on the store TV. */
export function StorePairings({ matches, className }: { matches: ReadonlyArray<MatchView>; className?: string }) {
  const seats: Array<Seat> = matches
    .flatMap((m) => [
      { player: m.player1, table: m.table, opponent: m.player2?.name ?? 'Bye', done: m.status === 'confirmed' },
      ...(m.player2
        ? [{ player: m.player2, table: m.table, opponent: m.player1.name, done: m.status === 'confirmed' }]
        : []),
    ])
    .sort((a, b) => a.player.name.localeCompare(b.player.name))

  return (
    <ol
      className={cn(
        'grid min-h-0 flex-1 auto-rows-min grid-cols-2 content-start gap-x-8 gap-y-1 overflow-hidden text-xl',
        className,
      )}
    >
      {seats.map((s) => (
        <li
          key={`${s.table}-${s.player.id}`}
          className={cn(
            'grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 border-b border-line py-2',
            s.done && 'text-paper-dim',
          )}
        >
          {/* A thin bar in the player's sleeve colour, so they spot themselves. */}
          <span
            aria-hidden
            data-slot="sleeve"
            className="h-7 w-1.5 rounded-full"
            style={{ backgroundColor: clothingHex(s.player.sleeveColour) }}
          />
          <Avatar avatar={s.player.avatar} size={30} />
          <span className="truncate">
            <span className="font-semibold">{s.player.name}</span>
            <span className="text-base text-paper-dim"> vs {s.opponent}</span>
          </span>
          <span className="font-numerals text-3xl text-orange">{s.table}</span>
        </li>
      ))}
    </ol>
  )
}
