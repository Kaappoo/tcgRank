import type { Standing } from '#/domain/standings.ts'
import type { EventFormat, EventStatus, MatchOutcome } from '../db/schema.ts'

export interface PlayerRef {
  readonly id: string
  readonly name: string
  readonly username: string | null
  readonly image: string | null
}

export type MatchStatus = 'playing' | 'reported' | 'confirmed'

export interface MatchView {
  readonly id: string
  readonly roundNumber: number
  readonly table: number
  readonly player1: PlayerRef
  readonly player2: PlayerRef | null
  readonly player1Games: number
  readonly player2Games: number
  readonly outcome: MatchOutcome | null
  readonly reportedById: string | null
  readonly status: MatchStatus
}

export interface RoundView {
  readonly id: string
  readonly number: number
  readonly status: 'active' | 'finished'
  readonly startedAt: number
  readonly endsAt: number | null
  readonly pausedRemainingMs: number | null
}

export interface EntrantView extends PlayerRef {
  readonly deckId: string | null
  readonly deckName: string | null
  readonly droppedAtRound: number | null
  readonly finalRank: number | null
}

export interface StandingView extends Standing {
  readonly player: PlayerRef
  readonly dropped: boolean
}

export interface EventSummary {
  readonly id: string
  readonly name: string
  readonly storeName: string
  readonly format: EventFormat
  readonly status: EventStatus
  readonly startsAt: number
  readonly currentRound: number
  readonly plannedRounds: number
  readonly playerCount: number
  readonly host: PlayerRef
}

export interface EventDetail {
  readonly event: EventSummary & {
    readonly description: string | null
    readonly joinCode: string
    readonly roundMinutes: number
    readonly finishedAt: number | null
  }
  readonly players: ReadonlyArray<EntrantView>
  readonly rounds: ReadonlyArray<RoundView>
  readonly matches: ReadonlyArray<MatchView>
  readonly standings: ReadonlyArray<StandingView>
  readonly viewer: {
    readonly userId: string
    readonly isHost: boolean
    readonly entry: EntrantView | null
    readonly currentMatch: MatchView | null
  } | null
  /** Lets clients correct for clock skew when rendering the match timer. */
  readonly serverNow: number
}

export const matchStatus = (m: { outcome: MatchOutcome | null; confirmedAt: Date | null }): MatchStatus =>
  m.confirmedAt ? 'confirmed' : m.outcome ? 'reported' : 'playing'
