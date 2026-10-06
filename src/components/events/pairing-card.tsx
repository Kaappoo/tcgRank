import { Link } from '@tanstack/react-router'
import { Avatar } from '#/components/ui/avatar.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import { formatRecord, type Standing } from '#/domain/standings.ts'
import type { MatchView, PlayerRef } from '#/server/events/views.ts'
import { cn } from '#/lib/utils.ts'

export interface PairingCardProps {
  readonly match: MatchView
  readonly viewerId: string
  readonly records?: ReadonlyMap<string, Pick<Standing, 'wins' | 'losses' | 'draws' | 'byes'>>
  readonly className?: string
}

/**
 * The moment a player looks at their phone after pairings go up.
 * The orange slab wipes across on every new pairing (keyed by match id).
 */
export function PairingCard({ match, viewerId, records, className }: PairingCardProps) {
  const me = match.player1.id === viewerId ? match.player1 : match.player2
  const opponent = match.player1.id === viewerId ? match.player2 : match.player1

  return (
    <section
      aria-label={`Round ${match.roundNumber} pairing`}
      className={cn('relative isolate overflow-hidden rounded-2xl border border-line bg-surface', className)}
    >
      <div key={match.id} aria-hidden className="slab right-[-12%] hidden w-[26%] animate-slab sm:block" />
      <div className="relative grid gap-6 p-5 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-paper-dim">Round {match.roundNumber}</p>
          <p className="flex -skew-x-12 animate-slab flex-col items-end rounded-md bg-orange px-4 py-2 text-on-orange sm:skew-x-0 sm:animate-none sm:bg-transparent sm:p-0">
            <span className="text-[11px] font-bold tracking-[0.08em]">TABLE</span>
            <span className="font-numerals text-6xl leading-[0.85] sm:text-7xl">{match.table}</span>
          </p>
        </div>

        {opponent ? (
          <div className="sm:pr-[16%]">
            <div className="flex flex-col gap-4">
              <Seat player={me} label="You" record={me ? records?.get(me.id) : undefined} />
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-line" />
                <span className="font-display text-sm text-orange">VS</span>
                <span className="h-px flex-1 bg-line" />
              </div>
              <Seat player={opponent} label="Opponent" record={records?.get(opponent.id)} emphasize />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 py-4">
            <p className="font-display text-4xl">Bye this round</p>
            <p className="max-w-sm text-paper-dim">
              You get the match win automatically. Grab a snack — you&apos;re back in next round.
            </p>
            <Badge variant="win" className="self-start">
              +3 points
            </Badge>
          </div>
        )}
      </div>
    </section>
  )
}

function Seat({
  player,
  label,
  record,
  emphasize,
}: {
  player: PlayerRef | null
  label: string
  record?: Pick<Standing, 'wins' | 'losses' | 'draws' | 'byes'> | undefined
  emphasize?: boolean
}) {
  if (!player) return null
  const name = (
    <span
      className={cn(
        'line-clamp-2 block break-words font-display',
        emphasize ? 'text-3xl sm:text-4xl' : 'text-xl text-paper-dim',
      )}
    >
      {player.name}
    </span>
  )
  return (
    <div className="flex min-w-0 items-center gap-4">
      <Avatar name={player.name} src={player.image} size={emphasize ? 'lg' : 'md'} />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-paper-dim">
          {label}
          {record ? <span className="tabular ml-2 text-paper">{formatRecord(record)}</span> : null}
        </p>
        {player.username ? (
          <Link to="/u/$username" params={{ username: player.username }} className="hover:text-orange">
            {name}
          </Link>
        ) : (
          name
        )}
      </div>
    </div>
  )
}
