import type { MatchView } from '#/server/events/views.ts'

export interface ResultOption {
  readonly id: string
  readonly label: string
  readonly mine: number
  readonly theirs: number
  readonly tone: 'win' | 'loss' | 'draw'
}

/** Best-of-three outcomes from the reporting player's point of view. */
export const RESULT_OPTIONS: ReadonlyArray<ResultOption> = [
  { id: 'w20', label: 'Won 2–0', mine: 2, theirs: 0, tone: 'win' },
  { id: 'w21', label: 'Won 2–1', mine: 2, theirs: 1, tone: 'win' },
  { id: 'w10', label: 'Won 1–0 on time', mine: 1, theirs: 0, tone: 'win' },
  { id: 'd11', label: 'Tie 1–1', mine: 1, theirs: 1, tone: 'draw' },
  { id: 'd00', label: 'Tie 0–0', mine: 0, theirs: 0, tone: 'draw' },
  { id: 'l01', label: 'Lost 0–1 on time', mine: 0, theirs: 1, tone: 'loss' },
  { id: 'l12', label: 'Lost 1–2', mine: 1, theirs: 2, tone: 'loss' },
  { id: 'l02', label: 'Lost 0–2', mine: 0, theirs: 2, tone: 'loss' },
]

/** Converts a "my score / their score" choice into stored player-1 / player-2 games. */
export const toGames = (
  match: Pick<MatchView, 'player1'>,
  viewerId: string,
  option: Pick<ResultOption, 'mine' | 'theirs'>,
) =>
  match.player1.id === viewerId
    ? { player1Games: option.mine, player2Games: option.theirs }
    : { player1Games: option.theirs, player2Games: option.mine }

/** Describes a stored result from one player's perspective, e.g. "Won 2–1". */
export const describeResult = (
  match: MatchView,
  viewerId: string,
): { text: string; tone: 'win' | 'loss' | 'draw' } | null => {
  if (!match.outcome) return null
  if (match.outcome === 'bye') return { text: 'Bye', tone: 'win' }
  const asP1 = match.player1.id === viewerId
  const mine = asP1 ? match.player1Games : match.player2Games
  const theirs = asP1 ? match.player2Games : match.player1Games
  if (match.outcome === 'draw') return { text: `Tie ${mine}–${theirs}`, tone: 'draw' }
  const won = (match.outcome === 'p1') === asP1
  return { text: `${won ? 'Won' : 'Lost'} ${mine}–${theirs}`, tone: won ? 'win' : 'loss' }
}
