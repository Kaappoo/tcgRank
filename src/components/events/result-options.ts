import type { Score } from '#/domain/best-of.ts'
import type { MatchView } from '#/server/events/views.ts'

export type ResultTone = 'win' | 'loss' | 'draw'

export interface ResultText {
  readonly text: string
  readonly tone: ResultTone
}

/** What a "my games / their games" score means, e.g. "Won 2–1". */
export const describeScore = (mine: number, theirs: number): ResultText => {
  if (mine === theirs) return { text: `Tie ${mine}–${theirs}`, tone: 'draw' }
  const won = mine > theirs
  return { text: `${won ? 'Won' : 'Lost'} ${mine}–${theirs}`, tone: won ? 'win' : 'loss' }
}

/** The viewer's games first: [mine, theirs]. */
export const myGames = (
  match: Pick<MatchView, 'player1' | 'player1Games' | 'player2Games'>,
  viewerId: string,
): Score =>
  match.player1.id === viewerId ? [match.player1Games, match.player2Games] : [match.player2Games, match.player1Games]

/** Converts a "my games / their games" score into stored player-1 / player-2 games. */
export const toGames = (
  match: Pick<MatchView, 'player1'>,
  viewerId: string,
  [mine, theirs]: Score,
) =>
  match.player1.id === viewerId
    ? { player1Games: mine, player2Games: theirs }
    : { player1Games: theirs, player2Games: mine }

/** Describes a stored result from one player's perspective, e.g. "Won 2–1". */
export const describeResult = (match: MatchView, viewerId: string): ResultText | null => {
  if (!match.outcome) return null
  if (match.outcome === 'bye') return { text: 'Bye', tone: 'win' }
  const [mine, theirs] = myGames(match, viewerId)
  return describeScore(mine, theirs)
}
