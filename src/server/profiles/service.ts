import { and, desc, eq, inArray, or, sql } from 'drizzle-orm'
import { Context, Effect, Layer } from 'effect'
import { bracketExits, eventBracket, placementStage, roundName } from '#/domain/bracket.ts'
import { countsInRecord } from '#/domain/standings.ts'
import type { ProfileInput } from '#/shared/schemas.ts'
import { requireUser } from '../current-user.ts'
import { Db } from '../db/client.ts'
import { bestTiers, type AchievementId } from '#/domain/achievements.ts'
import {
  decks,
  eventPlayers,
  events,
  matches,
  playerStyle,
  rounds,
  user,
  type DeckRow,
  type EventRow,
  type MatchOutcome,
  type MatchRow,
} from '../db/schema.ts'
import { InvalidState, NotFound } from '../errors.ts'
import type { PlayerRef } from '../events/views.ts'
import { AchievementsService } from '../identity/achievements.ts'
import { playerRefColumns, styleOf, toPlayerRef, type PartnerPokemon } from '../identity/style.ts'

export type MatchResult = 'win' | 'loss' | 'draw' | 'bye'

export interface MatchHistoryEntry {
  readonly matchId: string
  readonly eventId: string
  readonly eventName: string
  readonly playedAt: number
  /** "Round N", or the stage for an elimination round ("Semifinal"; "Round N" early in a bracket larger than 8). */
  readonly roundLabel: string
  readonly opponent: PlayerRef | null
  readonly result: MatchResult
  /** False for a bye in an elimination round: it shows as "Bye" but counts as nothing in the record. */
  readonly inRecord: boolean
  readonly score: string
}

export interface EventHistoryEntry {
  readonly eventId: string
  readonly name: string
  readonly storeName: string
  readonly startsAt: number
  readonly status: 'registration' | 'running' | 'finished'
  readonly finalRank: number | null
  /** How far the player got in a finished event with a bracket ("Champion", "Semifinal"…); null otherwise. */
  readonly stage: string | null
  readonly playerCount: number
  readonly wins: number
  readonly losses: number
  readonly draws: number
}

export interface ProfileStats {
  readonly eventsPlayed: number
  readonly eventsHosted: number
  readonly wins: number
  readonly losses: number
  readonly draws: number
  readonly winRate: number
  readonly bestFinish: number | null
}

/** The deck a player features, with their record in events where it was their registered deck. */
export interface FeaturedDeck {
  readonly id: string
  readonly name: string
  readonly archetype: string | null
  readonly format: DeckRow['format']
  readonly list: string
  readonly coverCard: string | null
  readonly cardImages: Readonly<Record<string, string>>
  readonly wins: number
  readonly losses: number
  readonly draws: number
}

/** What the trainer card shows beyond the look on `user`. */
interface ProfileIdentity {
  readonly sleeveColour: string
  readonly banner: string
  readonly bannerColour: string | null
  readonly partner: PartnerPokemon | null
  /** Showcased badges, in the order picked, each at its best tier. */
  readonly badges: ReadonlyArray<{ readonly achievement: AchievementId; readonly tier: number }>
  readonly featuredDeck: FeaturedDeck | null
  readonly earnedCount: number
}

interface Profile {
  readonly user: PlayerRef & {
    readonly playerId: string | null
    readonly bio: string | null
    readonly joinedAt: number
  }
  readonly identity: ProfileIdentity
  readonly stats: ProfileStats
  readonly events: ReadonlyArray<EventHistoryEntry>
  readonly matches: ReadonlyArray<MatchHistoryEntry>
}

/** Converts a stored outcome into the result from one player's point of view. */
export const resultFor = (
  playerId: string,
  m: { player1Id: string; player2Id: string | null; outcome: MatchOutcome | null },
): MatchResult | null => {
  if (m.outcome === null) return null
  if (m.outcome === 'bye' || m.player2Id === null) return 'bye'
  if (m.outcome === 'draw') return 'draw'
  const won = (m.outcome === 'p1') === (m.player1Id === playerId)
  return won ? 'win' : 'loss'
}

const roundLabel = (event: EventRow, roundNumber: number, elimination: boolean): string => {
  const bracket = elimination ? eventBracket(event) : null
  return bracket && roundNumber >= bracket.firstRound ? roundName(bracket, roundNumber) : `Round ${roundNumber}`
}

/** A confirmed match of the player's, with its event and whether it was an elimination round. */
interface PlayedMatch {
  readonly match: MatchRow
  readonly event: EventRow
  readonly elimination: boolean
}

const historyEntry = (
  playerId: string,
  { match, event, elimination }: PlayedMatch,
  opponents: ReadonlyMap<string, PlayerRef>,
): MatchHistoryEntry | null => {
  const result = resultFor(playerId, match)
  if (!result) return null
  const asP1 = match.player1Id === playerId
  const opponentId = asP1 ? match.player2Id : match.player1Id
  return {
    matchId: match.id,
    eventId: match.eventId,
    eventName: event.name,
    playedAt: (match.confirmedAt ?? match.reportedAt ?? new Date(0)).getTime(),
    roundLabel: roundLabel(event, match.roundNumber, elimination),
    opponent: opponentId ? (opponents.get(opponentId) ?? null) : null,
    result,
    inRecord: countsInRecord({ bye: result === 'bye', elimination }),
    score: asP1 ? `${match.player1Games}–${match.player2Games}` : `${match.player2Games}–${match.player1Games}`,
  }
}

/** W-L-T under the record rule. */
const recordOf = (history: ReadonlyArray<MatchHistoryEntry>) => {
  const counted = history.filter((h) => h.inRecord)
  const count = (result: MatchResult) => counted.filter((h) => h.result === result).length
  return { wins: count('win') + count('bye'), losses: count('loss'), draws: count('draw') }
}

/** How far a player got in a finished event's bracket ("Champion", "Finalist", "Semifinal"…), or null. */
const stageReached = (
  playerId: string,
  event: EventRow,
  droppedAtRound: number | null,
  played: ReadonlyArray<PlayedMatch>,
): string | null => {
  const bracket = eventBracket(event)
  if (!bracket || event.status !== 'finished') return null
  const bracketMatches = played.filter((p) => p.elimination && p.event.id === event.id).map((p) => p.match)
  const dropped = new Set(droppedAtRound === null ? [] : [playerId])
  const exits = bracketExits(bracket, bracketMatches, dropped)
  return exits.has(playerId) ? placementStage(bracket, exits.get(playerId) ?? null) : null
}

const make = Effect.gen(function* () {
  const db = yield* Db
  const achievements = yield* AchievementsService

  const byUsername = Effect.fn('ProfilesService.byUsername')(function* (username: string) {
    const found = yield* db.query((d) =>
      d
        .select({ user, style: playerStyle })
        .from(user)
        .leftJoin(playerStyle, eq(playerStyle.userId, user.id))
        .where(eq(sql`lower(${user.username})`, username.toLowerCase()))
        .limit(1),
    )
    const row = found[0]?.user
    if (!row) return yield* new NotFound({ entity: 'Player', id: username })
    const style = styleOf(row.id, found[0]?.style)

    const [entries, matchRows, hosted, earned, featured] = yield* Effect.all(
      [
        db.query((d) =>
          d
            .select({
              event: events,
              finalRank: eventPlayers.finalRank,
              droppedAtRound: eventPlayers.droppedAtRound,
              deckId: eventPlayers.deckId,
            })
            .from(eventPlayers)
            .innerJoin(events, eq(events.id, eventPlayers.eventId))
            .where(eq(eventPlayers.userId, row.id))
            .orderBy(desc(events.startsAt)),
        ),
        db.query((d) =>
          d
            .select({ match: matches, event: events, elimination: rounds.elimination })
            .from(matches)
            .innerJoin(events, eq(events.id, matches.eventId))
            .innerJoin(rounds, and(eq(rounds.eventId, matches.eventId), eq(rounds.number, matches.roundNumber)))
            .where(
              and(
                or(eq(matches.player1Id, row.id), eq(matches.player2Id, row.id)),
                sql`${matches.confirmedAt} is not null`,
              ),
            )
            .orderBy(desc(matches.confirmedAt), desc(matches.roundNumber)),
        ),
        db.query((d) =>
          d
            .select({ count: sql<number>`count(*)` })
            .from(events)
            .where(eq(events.hostId, row.id)),
        ),
        achievements.earned(row.id),
        style.featuredDeckId
          ? db.query((d) =>
              d.query.decks.findFirst({
                where: and(eq(decks.id, style.featuredDeckId!), eq(decks.userId, row.id), eq(decks.isPublic, true)),
              }),
            )
          : Effect.succeed(undefined),
      ],
      { concurrency: 'unbounded' },
    )

    const opponentIds = matchRows.map(({ match }) => (match.player1Id === row.id ? match.player2Id : match.player1Id))
    const ids = opponentIds.filter((id): id is string => id !== null)
    const opponents =
      ids.length === 0
        ? new Map<string, PlayerRef>()
        : new Map(
            (yield* db.query((d) =>
              d
                .select(playerRefColumns)
                .from(user)
                .leftJoin(playerStyle, eq(playerStyle.userId, user.id))
                .where(inArray(user.id, [...new Set(ids)])),
            )).map((r) => [r.id, toPlayerRef(r)]),
          )

    const eventIds = entries.map((e) => e.event.id)
    const counts =
      eventIds.length === 0
        ? new Map<string, number>()
        : new Map(
            (yield* db.query((d) =>
              d
                .select({ eventId: eventPlayers.eventId, count: sql<number>`count(*)` })
                .from(eventPlayers)
                .where(inArray(eventPlayers.eventId, eventIds))
                .groupBy(eventPlayers.eventId),
            )).map((c) => [c.eventId, Number(c.count)]),
          )

    const history = matchRows.flatMap((played) => historyEntry(row.id, played, opponents) ?? [])
    const record = recordOf(history)
    const played = record.wins + record.losses + record.draws
    const ranks = entries.map((e) => e.finalRank).filter((r): r is number => r !== null)
    const best = bestTiers(earned)
    const deckEvents = new Set(entries.filter((e) => featured && e.deckId === featured.id).map((e) => e.event.id))

    return {
      user: {
        id: row.id,
        name: row.name,
        username: row.username,
        avatar: style.avatar,
        sleeveColour: style.sleeveColour,
        title: style.title,
        playerId: row.playerId,
        bio: row.bio,
        joinedAt: row.createdAt.getTime(),
      },
      identity: {
        sleeveColour: style.sleeveColour,
        banner: style.banner,
        bannerColour: style.bannerColour,
        partner: style.partner,
        badges: style.showcase.flatMap((achievement) =>
          best.has(achievement) ? [{ achievement, tier: best.get(achievement)! }] : [],
        ),
        featuredDeck: featured
          ? {
              id: featured.id,
              name: featured.name,
              archetype: featured.archetype,
              format: featured.format,
              list: featured.list,
              coverCard: featured.coverCard,
              cardImages: featured.cardImages,
              ...recordOf(history.filter((h) => deckEvents.has(h.eventId))),
            }
          : null,
        earnedCount: earned.length,
      },
      stats: {
        eventsPlayed: entries.length,
        eventsHosted: Number(hosted[0]?.count ?? 0),
        ...record,
        winRate: played === 0 ? 0 : record.wins / played,
        bestFinish: ranks.length === 0 ? null : Math.min(...ranks),
      },
      events: entries.map(({ event, finalRank, droppedAtRound }) => ({
        eventId: event.id,
        name: event.name,
        storeName: event.storeName,
        startsAt: event.startsAt.getTime(),
        status: event.status,
        finalRank,
        stage: stageReached(row.id, event, droppedAtRound, matchRows),
        playerCount: counts.get(event.id) ?? 0,
        ...recordOf(history.filter((h) => h.eventId === event.id)),
      })),
      matches: history,
    } satisfies Profile
  })

  const updateMine = Effect.fn('ProfilesService.updateMine')(function* (input: ProfileInput) {
    const me = yield* requireUser
    const taken = yield* db.query((d) =>
      d.query.user.findFirst({ where: eq(sql`lower(${user.username})`, input.username.toLowerCase()) }),
    )
    if (taken && taken.id !== me.id) return yield* new InvalidState({ reason: 'That username is taken' })
    yield* db.query((d) =>
      d
        .update(user)
        .set({
          name: input.name,
          username: input.username.toLowerCase(),
          displayUsername: input.username,
          playerId: input.playerId || null,
          bio: input.bio || null,
        })
        .where(eq(user.id, me.id)),
    )
    return { username: input.username.toLowerCase() }
  })

  const me = Effect.fn('ProfilesService.me')(function* () {
    const current = yield* requireUser
    const row = yield* db.query((d) => d.query.user.findFirst({ where: eq(user.id, current.id) }))
    if (!row) return yield* new NotFound({ entity: 'Player', id: current.id })
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      username: row.displayUsername ?? row.username,
      playerId: row.playerId,
      bio: row.bio,
    }
  })

  return { byUsername, updateMine, me }
})

export class ProfilesService extends Context.Service<ProfilesService, Effect.Success<typeof make>>()(
  'tcgrank/server/profiles/ProfilesService',
) {
  static readonly layer = Layer.effect(ProfilesService, make).pipe(Layer.provide(AchievementsService.layer))
}
