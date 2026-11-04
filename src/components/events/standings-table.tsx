import { Link } from '@tanstack/react-router'
import { Fragment } from 'react'
import { Avatar } from '#/components/ui/avatar.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import { formatPercentage, formatRecord, type Tiebreakers } from '#/domain/standings.ts'
import type { StandingView } from '#/server/events/views.ts'
import { cn } from '#/lib/utils.ts'

/**
 * Standings with the tiebreaker columns of the event's pairing system: Swiss shows OMW and OOMW, round robin GW% and
 * OMW. Final standings of a top cut event keep the Swiss columns, badge each cut player with their stage and close the
 * cut with a "Top N cut" divider.
 */
export function StandingsTable({
  standings,
  highlightId,
  final,
  tiebreakers = 'swiss',
  topCutSize = null,
}: {
  standings: ReadonlyArray<StandingView>
  highlightId?: string | null
  final?: boolean
  tiebreakers?: Tiebreakers
  /** Set on a finished top cut event: the players in the cut come first. */
  topCutSize?: number | null
}) {
  const roundRobin = tiebreakers === 'round_robin'
  const cut = topCutSize ?? 0
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[34rem] text-sm">
        <caption className="sr-only">{final ? 'Final standings' : 'Current standings'}</caption>
        <thead>
          <tr className="border-b border-line bg-surface text-left text-xs text-paper-dim">
            <th scope="col" className="w-14 px-4 py-3 font-semibold">
              #
            </th>
            <th scope="col" className="px-2 py-3 font-semibold">
              Player
            </th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">
              Pts
            </th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">
              W-L-T
            </th>
            {roundRobin ? (
              <th scope="col" className="px-3 py-3 text-right font-semibold" title="Game-win percentage">
                GW%
              </th>
            ) : null}
            <th
              scope="col"
              className={cn('py-3 text-right font-semibold', roundRobin ? 'px-4' : 'px-3')}
              title="Opponents' match win percentage"
            >
              OMW
            </th>
            {roundRobin ? null : (
              <th
                scope="col"
                className="px-4 py-3 text-right font-semibold"
                title="Opponents' opponents' match win percentage"
              >
                OOMW
              </th>
            )}
          </tr>
        </thead>
        <tbody className="stagger">
          {standings.map((s, index) => (
            <Fragment key={s.playerId}>
              <tr
                style={{ ['--i' as string]: index }}
                className={cn(
                  'border-b border-line/60 last:border-0 transition-colors hover:bg-surface',
                  s.playerId === highlightId && 'bg-orange/[0.07]',
                  s.dropped && 'text-paper-dim',
                )}
              >
                <td className="px-4 py-3">
                  <span className={cn('font-numerals text-2xl', final && s.rank === 1 ? 'text-orange' : 'text-paper')}>
                    {s.rank}
                  </span>
                </td>
                <td className="px-2 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={s.player.name} src={s.player.image} size="sm" />
                    {s.player.username ? (
                      <Link
                        to="/u/$username"
                        params={{ username: s.player.username }}
                        className="truncate font-semibold hover:text-orange"
                      >
                        {s.player.name}
                      </Link>
                    ) : (
                      <span className="truncate font-semibold">{s.player.name}</span>
                    )}
                    {s.playerId === highlightId ? <Badge variant="live">You</Badge> : null}
                    {cut > 0 && s.stage ? <Badge variant="outline">{s.stage}</Badge> : null}
                    {s.dropped ? <Badge variant="muted">Dropped</Badge> : null}
                    {s.headToHead ? (
                      <Badge variant="outline" title="Placed above the player tied on points by beating them">
                        H2H
                      </Badge>
                    ) : null}
                  </div>
                </td>
                <td className="tabular px-3 py-3 text-right font-bold">{s.points}</td>
                <td className="tabular px-3 py-3 text-right">{formatRecord(s)}</td>
                {roundRobin ? (
                  <td className="tabular px-3 py-3 text-right text-paper-dim">
                    {formatPercentage(s.gameWinPercentage)}
                  </td>
                ) : null}
                <td className={cn('tabular py-3 text-right text-paper-dim', roundRobin ? 'px-4' : 'px-3')}>
                  {formatPercentage(s.opponentWinPercentage)}
                </td>
                {roundRobin ? null : (
                  <td className="tabular px-4 py-3 text-right text-paper-dim">
                    {formatPercentage(s.opponentOpponentWinPercentage)}
                  </td>
                )}
              </tr>
              {index === cut - 1 && index < standings.length - 1 ? (
                <tr className="border-b border-line/60">
                  <td colSpan={6} className="bg-surface px-4 py-1.5 text-xs font-semibold text-paper-dim">
                    Top {cut} cut
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
