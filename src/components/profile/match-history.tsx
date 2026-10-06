import { Link } from '@tanstack/react-router'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import { Badge } from '#/components/ui/badge.tsx'
import type { MatchHistoryEntry } from '#/server/profiles/service.ts'

const tone = { win: 'win', loss: 'loss', draw: 'draw', bye: 'muted' } as const
const label = { win: 'W', loss: 'L', draw: 'T', bye: 'Bye' } as const

/** Every match a player has played — virtualized, since regulars rack up hundreds. */
export function MatchHistory({ matches }: { matches: ReadonlyArray<MatchHistoryEntry> }) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: matches.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 8,
  })

  if (matches.length === 0) return <p className="py-6 text-paper-dim">No confirmed matches yet.</p>

  return (
    <div
      ref={parentRef}
      className="max-h-[32rem] overflow-y-auto rounded-xl border border-line"
      tabIndex={0}
      aria-label="Match history"
    >
      <ol className="relative" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => {
          const m = matches[item.index]!
          return (
            <li
              key={m.matchId}
              className="absolute inset-x-0 top-0 grid h-16 grid-cols-[3rem_1fr_auto] items-center gap-3 border-b border-line/60 px-4"
              style={{ transform: `translateY(${item.start}px)` }}
            >
              <Badge variant={tone[m.result]} className="justify-center">
                {label[m.result]}
              </Badge>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {m.opponent ? (
                    <>
                      vs{' '}
                      {m.opponent.username ? (
                        <Link
                          to="/u/$username"
                          params={{ username: m.opponent.username }}
                          className="hover:text-orange"
                        >
                          {m.opponent.name}
                        </Link>
                      ) : (
                        m.opponent.name
                      )}
                    </>
                  ) : (
                    'Bye'
                  )}
                </p>
                <p className="truncate text-xs text-paper-dim">
                  <Link to="/events/$eventId" params={{ eventId: m.eventId }} className="hover:text-paper">
                    {m.eventName}
                  </Link>{' '}
                  · Round {m.roundNumber}
                </p>
              </div>
              <span className="font-numerals text-2xl">{m.result === 'bye' ? '—' : m.score}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
