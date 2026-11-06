import type { BestOf } from '#/domain/best-of.ts'
import type { PlacementStage } from '#/domain/bracket.ts'
import type { PairingSystem, TopCutSize } from '#/domain/event-setup.ts'
import type { EventProgress } from '#/domain/progress.ts'
import type { Standing } from '#/domain/standings.ts'
import type { EventFormat, EventStatus, MatchOutcome } from '../db/schema.ts'
import type { PlayerLook } from '../identity/style.ts'

/** A player as every view shows them: name, avatar, sleeve colour and shown title. */
export interface PlayerRef extends PlayerLook {
  readonly id: string
  readonly name: string
  readonly username: string | null
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
  /** Position in an elimination round's bracket; null outside elimination rounds. */
  readonly bracketSlot: number | null
  /** An elimination match lost by a drop (during it, or before it in a top cut): recorded as the opponent's win. */
  readonly dropped: boolean
}

export interface RoundView {
  readonly id: string
  readonly number: number
  readonly status: 'active' | 'finished'
  readonly startedAt: number
  readonly endsAt: number | null
  readonly pausedRemainingMs: number | null
  /** A round of a top cut or a single-elimination event: matches can't tie and losers are out. */
  readonly elimination: boolean
  /** Minutes on this round's clock: the top cut round timer in a top cut, the event's round timer otherwise. */
  readonly minutes: number
}

export interface EntrantView extends PlayerRef {
  /** Added by the host without an account; the host or their opponent reports for them. */
  readonly isGuest: boolean
  readonly deckId: string | null
  readonly deckName: string | null
  readonly droppedAtRound: number | null
  readonly finalRank: number | null
  /** Bracket seed, 1 strongest; null until the bracket is drawn. */
  readonly seed: number | null
}

/** A guest on the host's guest list, as only that host sees it. */
export interface GuestView {
  readonly id: string
  readonly name: string
  /** Opens `/claim/$code` for the guest to move their results to an account. */
  readonly claimCode: string
  readonly eventCount: number
}

export interface StandingView extends Standing {
  readonly player: PlayerRef
  readonly dropped: boolean
  /** How far a player got in a bracket ("Champion", "Finalist", "Semifinal"…): once finished, and in a top cut being played. */
  readonly stage: PlacementStage | null
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
  readonly deckRequired: boolean
  readonly bestOf: BestOf
  readonly pairingSystem: PairingSystem
  /** A Swiss event that cuts to a bracket after its Swiss rounds. Always false outside Swiss. */
  readonly topCut: boolean
  /** The size of the top cut once the event has cut (2, 4 or 8); null before the cut and without one. */
  readonly topCutSize: TopCutSize | null
  /** Why new players and rejoins are refused (worded for the cause), or null while entry is open. */
  readonly entriesClosedReason: string | null
  readonly playerCount: number
  readonly host: PlayerRef
}

export interface EventDetail {
  readonly event: EventSummary & {
    readonly description: string | null
    readonly joinCode: string
    readonly roundMinutes: number
    /** The top cut round timer the host set at the cut; null before the cut and without one. */
    readonly topCutRoundMinutes: number | null
    readonly finishedAt: number | null
  }
  readonly players: ReadonlyArray<EntrantView>
  readonly rounds: ReadonlyArray<RoundView>
  readonly matches: ReadonlyArray<MatchView>
  readonly standings: ReadonlyArray<StandingView>
  /** Where the event stands in its rounds (the bracket, the last round, the cut), so views don't re-derive the rules. */
  readonly progress: EventProgress
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
