/**
 * PROTOTYPE — throwaway, do not ship.
 *
 * Answers "What does an elimination bracket look like in Pairings and on the
 * store screen?" (#17). Three phone variants for the Pairings tab and three
 * store-screen variants, switchable with `?bracket=A|B|C` on
 * `/events/$eventId` and `/events/$eventId/screen`.
 *
 * Fixture: a 7-player single-elimination event (bracket of 8, seed 1 has a
 * bye), mid-event: quarterfinals done, semifinals being played. The viewer is
 * Diego (seed 4), whose path is highlighted.
 */
import { Check, Clock3, Crown, Trophy } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '#/components/ui/badge.tsx'
import { cn } from '#/lib/utils.ts'

type Status = 'final' | 'confirming' | 'playing' | 'waiting'

interface Seat {
  readonly seed: number
  readonly name: string
}

interface Match {
  readonly table: number | null
  readonly a: Seat | null
  /** `null` with `a` set is a bye. */
  readonly b: Seat | null
  readonly score: readonly [number, number] | null
  readonly winner: 'a' | 'b' | null
  readonly status: Status
  readonly bye?: boolean
}

interface BracketRound {
  readonly name: string
  readonly short: string
  readonly matches: ReadonlyArray<Match>
}

const P = {
  ana: { seed: 1, name: 'Ana Ribeiro' },
  bruno: { seed: 2, name: 'Bruno Costa' },
  carla: { seed: 3, name: 'Carla Mendes' },
  diego: { seed: 4, name: 'Diego Alves' },
  elisa: { seed: 5, name: 'Elisa Prado' },
  felipe: { seed: 6, name: 'Felipe Rocha' },
  gabi: { seed: 7, name: 'Gabi Nunes' },
} as const satisfies Record<string, Seat>

const VIEWER = P.diego.seed

/** Standard bracket order: 1v8, 4v5 | 2v7, 3v6. */
const BRACKET: ReadonlyArray<BracketRound> = [
  {
    name: 'Quarterfinals',
    short: 'QF',
    matches: [
      { table: null, a: P.ana, b: null, score: null, winner: 'a', status: 'final', bye: true },
      { table: 2, a: P.diego, b: P.elisa, score: [2, 1], winner: 'a', status: 'final' },
      { table: 3, a: P.bruno, b: P.gabi, score: [2, 0], winner: 'a', status: 'final' },
      { table: 4, a: P.carla, b: P.felipe, score: [1, 2], winner: 'b', status: 'final' },
    ],
  },
  {
    name: 'Semifinals',
    short: 'SF',
    matches: [
      { table: 1, a: P.ana, b: P.diego, score: null, winner: null, status: 'playing' },
      { table: 2, a: P.bruno, b: P.felipe, score: [2, 0], winner: 'a', status: 'final' },
    ],
  },
  {
    name: 'Final',
    short: 'F',
    matches: [{ table: null, a: null, b: P.bruno, score: null, winner: null, status: 'waiting' }],
  },
]

const CURRENT = 1

const hasSeed = (m: Match, seed: number) => m.a?.seed === seed || m.b?.seed === seed
const isMine = (m: Match) => hasSeed(m, VIEWER)
const winnerOf = (m: Match) => (m.winner === 'a' ? m.a : m.winner === 'b' ? m.b : null)

function StatusBadge({ m }: { m: Match }) {
  if (m.bye) return <Badge variant="muted">Bye</Badge>
  if (m.status === 'final')
    return (
      <Badge variant="muted">
        <Check /> Final
      </Badge>
    )
  if (m.status === 'confirming')
    return (
      <Badge variant="live">
        <Clock3 /> Confirming
      </Badge>
    )
  if (m.status === 'playing') return <Badge variant="outline">Playing</Badge>
  return <Badge variant="outline">Up next</Badge>
}

/** One player line inside a match box. */
function SeatLine({
  seat,
  m,
  side,
  size = 'sm',
}: {
  seat: Seat | null
  m: Match
  side: 'a' | 'b'
  size?: 'sm' | 'lg' | 'xl'
}) {
  const won = m.winner === side
  const lost = m.winner !== null && !won && !m.bye
  const games = m.score ? m.score[side === 'a' ? 0 : 1] : null
  const me = seat?.seed === VIEWER
  return (
    <div
      className={cn(
        'grid grid-cols-[1.5em_1fr_auto] items-baseline gap-2',
        size === 'sm' && 'text-sm',
        size === 'lg' && 'text-2xl',
        size === 'xl' && 'text-4xl',
        lost && 'text-paper-dim',
      )}
    >
      <span className="font-numerals text-paper-dim tabular">{seat?.seed ?? ''}</span>
      <span className={cn('truncate font-semibold', me && 'text-orange', !seat && 'font-normal text-paper-dim')}>
        {seat?.name ?? (m.bye && side === 'b' ? 'Bye' : 'Winner of SF 1')}
      </span>
      <span className={cn('font-numerals tabular', won ? 'text-win' : 'text-paper-dim')}>{games ?? ''}</span>
    </div>
  )
}

function MatchBox({ m, size = 'sm', className }: { m: Match; size?: 'sm' | 'lg' | 'xl'; className?: string }) {
  const live = m.status === 'playing' || m.status === 'confirming'
  return (
    <div
      className={cn(
        'relative grid gap-1 rounded-lg border bg-surface',
        size === 'sm' ? 'px-3 py-2' : size === 'lg' ? 'gap-2 px-5 py-4' : 'gap-3 px-7 py-6',
        isMine(m) ? 'border-orange' : live ? 'border-line-strong' : 'border-line',
        m.bye && 'border-dashed',
      )}
    >
      {m.table !== null && live ? (
        <span
          className={cn(
            'absolute -top-2.5 right-3 rounded-sm bg-orange px-1.5 font-numerals leading-tight text-on-orange',
            size === 'sm' ? 'text-sm' : 'text-xl',
          )}
        >
          T{m.table}
        </span>
      ) : null}
      <SeatLine seat={m.a} m={m} side="a" size={size} />
      <SeatLine seat={m.b} m={m} side="b" size={size} />
      {className ? <span className={className} /> : null}
    </div>
  )
}

/**
 * Classic left-to-right tree. Every column has the same height and each match
 * takes an equal share of it, so a pair's midpoint lines up with the match it
 * feeds. Connectors are borders on the pair wrapper.
 */
function Tree({
  rounds,
  size = 'sm',
  colClass,
  gap = 'gap-6',
  mirror = false,
}: {
  rounds: ReadonlyArray<BracketRound>
  size?: 'sm' | 'lg'
  colClass?: string
  gap?: string
  mirror?: boolean
}) {
  return (
    <div className={cn('flex h-full', gap, mirror && 'flex-row-reverse')}>
      {rounds.map((round, r) => {
        const last = r === rounds.length - 1
        const pairs: Match[][] = []
        for (let i = 0; i < round.matches.length; i += last ? 1 : 2) pairs.push(round.matches.slice(i, i + (last ? 1 : 2)))
        return (
          <div key={round.name} className={cn('flex min-w-0 flex-col', colClass)}>
            <p
              className={cn(
                'mb-3 font-semibold',
                size === 'sm' ? 'text-xs text-paper-dim' : 'text-lg text-paper-dim',
                r === CURRENT && 'text-orange',
              )}
            >
              {round.name}
            </p>
            <div className="flex flex-1 flex-col">
              {pairs.map((pair, p) => (
                <div key={p} className="relative flex flex-1 flex-col">
                  {pair.map((m, k) => (
                    <div key={k} className="flex flex-1 flex-col justify-center py-1.5">
                      <MatchBox m={m} size={size} />
                    </div>
                  ))}
                  {!last ? (
                    <>
                      <span
                        aria-hidden
                        className={cn(
                          'absolute inset-y-1/4 w-3 border-y',
                          mirror ? '-left-3 border-l' : '-right-3 border-r',
                          pair.some(isMine) ? 'border-orange' : 'border-line-strong',
                        )}
                      />
                      <span
                        aria-hidden
                        className={cn(
                          'absolute top-1/2 w-3 border-t',
                          mirror ? '-left-6' : '-right-6',
                          pair.some((m) => isMine(m) && winnerOf(m)?.seed === VIEWER)
                            ? 'border-orange'
                            : 'border-line-strong',
                        )}
                      />
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Phone variants (Pairings tab)                                       */
/* ------------------------------------------------------------------ */

/** A — the tree itself, scrolled sideways, snapping one round at a time. */
function PhoneTree() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-paper-dim">Swipe for later rounds.</p>
      <div className="-mx-4 snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 pb-2">
        <div className="h-[30rem] w-max">
          <Tree rounds={BRACKET} colClass="w-[13.5rem] snap-start" />
        </div>
      </div>
    </div>
  )
}

/** B — your path first, then each round as a plain list, newest on top. */
function PhonePath() {
  const steps = BRACKET.map((round) => ({ round, m: round.matches.find(isMine) ?? round.matches.find((x) => !x.a) }))
  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Your path" className="rounded-xl border border-orange/50 bg-surface p-4">
        <p className="mb-3 font-display text-xl">Your path</p>
        <ol className="grid grid-cols-3 gap-2">
          {steps.map(({ round, m }, i) => {
            const opp = m ? (m.a?.seed === VIEWER ? m.b : (m.a ?? m.b)) : null
            const won = m && winnerOf(m)?.seed === VIEWER
            const now = i === CURRENT
            return (
              <li
                key={round.name}
                className={cn(
                  'flex flex-col gap-1 rounded-lg border p-2.5',
                  now ? 'border-orange bg-orange/12' : 'border-line',
                )}
              >
                <span className={cn('text-xs font-semibold', now ? 'text-orange' : 'text-paper-dim')}>{round.name}</span>
                <span className="truncate text-sm font-semibold">{opp ? `vs ${opp.name.split(' ')[0]}` : 'TBD'}</span>
                <span
                  className={cn(
                    'font-numerals text-lg',
                    won ? 'text-win' : now ? 'text-orange' : 'text-paper-dim',
                  )}
                >
                  {won && m?.score ? `W ${m.score[0]}–${m.score[1]}` : now ? `Table ${m?.table}` : 'Waiting'}
                </span>
              </li>
            )
          })}
        </ol>
      </section>

      {[...BRACKET.keys()]
        .slice(0, CURRENT + 1)
        .reverse()
        .map((r) => {
          const round = BRACKET[r]!
          return (
            <section key={round.name} aria-label={round.name} className="flex flex-col gap-2">
              <p className={cn('font-semibold', r === CURRENT ? 'text-orange' : 'text-paper-dim')}>{round.name}</p>
              <ul className="grid gap-2">
                {round.matches.map((m, i) => (
                  <li
                    key={i}
                    className={cn(
                      'grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 rounded-xl border bg-surface px-4 py-3',
                      isMine(m) ? 'border-orange/50' : 'border-line',
                    )}
                  >
                    <span className="font-numerals text-3xl text-paper-dim">{m.table ?? '–'}</span>
                    <div className="grid gap-0.5">
                      <SeatLine seat={m.a} m={m} side="a" />
                      <SeatLine seat={m.b} m={m} side="b" />
                    </div>
                    <StatusBadge m={m} />
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      <p className="text-sm text-paper-dim">Final: Bruno Costa vs the winner of table 1.</p>
    </div>
  )
}

/** C — a board of seeds: one row per player, one column per round. */
function PhoneBoard() {
  const seats = [...Object.values(P)].sort((x: Seat, y: Seat) => x.seed - y.seed) as Seat[]
  const cell = (seat: Seat, r: number) => {
    const m = BRACKET[r]!.matches.find((x) => hasSeed(x, seat.seed))
    if (!m) {
      const out = BRACKET.slice(0, r).some((round) =>
        round.matches.some((x) => hasSeed(x, seat.seed) && x.winner !== null && winnerOf(x)?.seed !== seat.seed),
      )
      return out ? <span className="text-paper-dim">·</span> : <span className="text-paper-dim">—</span>
    }
    if (m.bye) return <span className="text-sm font-semibold text-paper-dim">Bye</span>
    if (m.status === 'waiting') return <span className="text-sm font-semibold text-paper-dim">Next</span>
    if (m.winner === null)
      return <span className="font-numerals rounded-sm bg-orange px-1.5 text-lg text-on-orange">T{m.table}</span>
    const won = winnerOf(m)?.seed === seat.seed
    const [g1, g2] = m.score ?? [0, 0]
    const mine = m.a?.seed === seat.seed ? [g1, g2] : [g2, g1]
    return (
      <span className={cn('font-numerals text-lg', won ? 'text-win' : 'text-loss')}>
        {won ? 'W' : 'L'} {mine[0]}–{mine[1]}
      </span>
    )
  }
  const alive = (seat: Seat) =>
    !BRACKET.some((round) =>
      round.matches.some((x) => hasSeed(x, seat.seed) && x.winner !== null && winnerOf(x)?.seed !== seat.seed),
    )
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <table className="w-full text-left">
        <thead className="bg-surface text-xs text-paper-dim">
          <tr>
            <th className="px-3 py-2 font-semibold">Seed</th>
            {BRACKET.map((round, r) => (
              <th key={round.short} className={cn('px-2 py-2 text-center font-semibold', r === CURRENT && 'text-orange')}>
                {round.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {seats
            .slice().sort((x, y) => Number(alive(y)) - Number(alive(x)) || x.seed - y.seed)
            .map((seat) => (
              <tr
                key={seat.seed}
                className={cn(
                  'border-t border-line',
                  seat.seed === VIEWER && 'bg-orange/12',
                  !alive(seat) && 'text-paper-dim',
                )}
              >
                <td className="px-3 py-3">
                  <span className="font-numerals mr-2 text-paper-dim">{seat.seed}</span>
                  <span className={cn('font-semibold', seat.seed === VIEWER && 'text-orange')}>{seat.name}</span>
                </td>
                {BRACKET.map((round, r) => (
                  <td key={round.short} className="px-2 py-3 text-center">
                    {cell(seat, r)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}

export const PHONE_VARIANTS = [
  { key: 'A', name: 'Swipe tree', Component: PhoneTree },
  { key: 'B', name: 'Your path + lists', Component: PhonePath },
  { key: 'C', name: 'Seed board', Component: PhoneBoard },
] as const

/* ------------------------------------------------------------------ */
/* Store screen variants                                               */
/* ------------------------------------------------------------------ */

export interface ScreenSlots {
  readonly eventName: string
  readonly logo: ReactNode
  readonly clock: ReactNode
  readonly qr: ReactNode
}

/** A — the whole screen is the tree; clock and QR shrink into a header strip. */
function ScreenTree({ eventName, logo, clock, qr }: ScreenSlots) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col gap-8 overflow-hidden bg-ink p-10">
      <header className="flex items-center gap-8">
        {logo}
        <h1 className="font-display text-4xl">{eventName}</h1>
        <span className="text-2xl font-semibold text-orange">Semifinals</span>
        <div className="ml-auto flex items-center gap-8">
          {clock}
          <div className="size-28 shrink-0">{qr}</div>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <Tree rounds={BRACKET} size="lg" colClass="flex-1" gap="gap-12" />
      </div>
    </div>
  )
}

/** B — two halves converge on the final in the centre, the trophy above it. */
function ScreenMirror({ eventName, logo, clock, qr }: ScreenSlots) {
  const half = (h: 0 | 1) =>
    BRACKET.slice(0, -1).map((round) => {
      const n = round.matches.length / 2
      return { ...round, matches: round.matches.slice(h * n, h * n + n) }
    })
  const final = BRACKET.at(-1)!.matches[0]!
  return (
    <div className="fixed inset-0 z-50 grid grid-rows-[auto_1fr] gap-6 overflow-hidden bg-ink p-10">
      <header className="flex items-center justify-between">
        {logo}
        <h1 className="font-display text-4xl">{eventName}</h1>
        <div className="size-24 shrink-0">{qr}</div>
      </header>
      <div className="grid min-h-0 grid-cols-[1fr_minmax(0,0.9fr)_1fr] gap-12">
        <Tree rounds={half(0)} size="lg" colClass="flex-1" gap="gap-12" />
        <div className="flex flex-col items-center justify-center gap-8">
          <Trophy className="size-16 text-orange" />
          <p className="font-display text-3xl">Final</p>
          <div className="w-full">
            <MatchBox m={final} size="lg" />
          </div>
          {clock}
        </div>
        <Tree rounds={half(1)} size="lg" colClass="flex-1" gap="gap-12" mirror />
      </div>
    </div>
  )
}

/** C — what's on the tables now, huge; the bracket shrinks to a strip. */
function ScreenNow({ eventName, logo, clock, qr }: ScreenSlots) {
  const live = BRACKET[CURRENT]!
  return (
    <div className="fixed inset-0 z-50 grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-10 overflow-hidden bg-ink p-10">
      <section className="flex min-h-0 flex-col gap-8">
        <div className="flex items-center gap-6">
          {logo}
          <h1 className="font-display text-4xl">{eventName}</h1>
        </div>
        <p className="font-display text-6xl text-orange">{live.name}</p>
        <div className="grid gap-6">
          {live.matches.map((m, i) => (
            <div key={i} className="grid grid-cols-[8rem_1fr] items-center gap-8">
              <span className="font-numerals text-9xl leading-none text-orange">{m.table}</span>
              <div className="flex flex-col gap-3">
                <MatchBox m={m} size="xl" />
                <StatusBadge m={m} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-auto flex items-center gap-3 text-2xl text-paper-dim">
          <Crown className="size-7 text-orange" /> Final next: Bruno Costa vs the winner of table 1
        </p>
      </section>
      <aside className="flex min-h-0 flex-col gap-8 border-l border-line pl-10">
        {clock}
        <div className="min-h-0 flex-1">
          <Tree rounds={BRACKET} colClass="flex-1" gap="gap-6" />
        </div>
        <div className="flex items-center gap-6">
          <div className="size-32 shrink-0">{qr}</div>
          <p className="text-xl text-paper-dim">Scan to follow the bracket</p>
        </div>
      </aside>
    </div>
  )
}

export const SCREEN_VARIANTS = [
  { key: 'A', name: 'Full-screen tree', Component: ScreenTree },
  { key: 'B', name: 'Mirrored halves', Component: ScreenMirror },
  { key: 'C', name: 'Now playing + strip', Component: ScreenNow },
] as const
