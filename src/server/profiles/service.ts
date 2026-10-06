import { and, desc, eq, inArray, or, sql } from 'drizzle-orm'
import { Context, Effect, Layer } from 'effect'
import type { ProfileInput } from '#/shared/schemas.ts'
import { requireUser } from '../current-user.ts'
import { Db } from '../db/client.ts'
import { eventPlayers, events, matches, user, type MatchOutcome } from '../db/schema.ts'
import { InvalidState, NotFound } from '../errors.ts'
import type { PlayerRef } from '../events/views.ts'

export type MatchResult = 'win' | 'loss' | 'draw' | 'bye'

export interface MatchHistoryEntry {
  readonly matchId: string
  readonly eventId: string
  readonly eventName: string
  readonly playedAt: number
  readonly roundNumber: number
  readonly opponent: PlayerRef | null
  readonly result: MatchResult
  readonly score: string
}

export interface EventHistoryEntry {
  readonly eventId: string
  readonly name: string
  readonly storeName: string
  readonly startsAt: number
  readonly status: 'registration' | 'running' | 'finished'
  readonly finalRank: number | null
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

export interface Profile {
  readonly user: PlayerRef & {
    readonly playerId: string | null
    readonly bio: string | null
    readonly joinedAt: number
  }
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

const make = Effect.gen(function* () {
  const db = yield* Db

  const byUsername = Effect.fn('ProfilesService.byUsername')(function* (username: string) {
    const row = yield* db.query((d) =>
      d.query.user.findFirst({ where: eq(sql`lower(${user.username})`, username.toLowerCase()) }),
    )
    if (!row) return yield* new NotFound({ entity: 'Player', id: username })

    const [entries, matchRows, hosted] = yield* Effect.all(
      [
        db.query((d) =>
          d
            .select({ event: events, finalRank: eventPlayers.finalRank })
            .from(eventPlayers)
            .innerJoin(events, eq(events.id, eventPlayers.eventId))
            .where(eq(eventPlayers.userId, row.id))
            .orderBy(desc(events.startsAt)),
        ),
        db.query((d) =>
          d
            .select({ match: matches, eventName: events.name })
            .from(matches)
            .innerJoin(events, eq(events.id, matches.eventId))
            .where(
              and(
                or(eq(matches.player1Id, row.id), eq(matches.player2Id, row.id)),
                sql`${matches.confirmedAt} is not null`,
              ),
            )
            .orderBy(desc(matches.confirmedAt)),
        ),
        db.query((d) =>
          d
            .select({ count: sql<number>`count(*)` })
            .from(events)
            .where(eq(events.hostId, row.id)),
        ),
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
                .select({ id: user.id, name: user.name, username: user.username, image: user.image })
                .from(user)
                .where(inArray(user.id, [...new Set(ids)])),
            )).map((r) => [r.id, r]),
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

    const history: Array<MatchHistoryEntry> = []
    const perEvent = new Map<string, { wins: number; losses: number; draws: number }>()
    for (const { match, eventName } of matchRows) {
      const result = resultFor(row.id, match)
      if (!result) continue
      const asP1 = match.player1Id === row.id
      const opponentId = asP1 ? match.player2Id : match.player1Id
      history.push({
        matchId: match.id,
        eventId: match.eventId,
        eventName,
        playedAt: (match.confirmedAt ?? match.reportedAt ?? new Date(0)).getTime(),
        roundNumber: match.roundNumber,
        opponent: opponentId ? (opponents.get(opponentId) ?? null) : null,
        result,
        score: asP1 ? `${match.player1Games}–${match.player2Games}` : `${match.player2Games}–${match.player1Games}`,
      })
      const tally = perEvent.get(match.eventId) ?? { wins: 0, losses: 0, draws: 0 }
      if (result === 'win' || result === 'bye') tally.wins++
      else if (result === 'loss') tally.losses++
      else tally.draws++
      perEvent.set(match.eventId, tally)
    }

    const wins = history.filter((h) => h.result === 'win' || h.result === 'bye').length
    const losses = history.filter((h) => h.result === 'loss').length
    const draws = history.filter((h) => h.result === 'draw').length
    const ranks = entries.map((e) => e.finalRank).filter((r): r is number => r !== null)

    return {
      user: {
        id: row.id,
        name: row.name,
        username: row.username,
        image: row.image,
        playerId: row.playerId,
        bio: row.bio,
        joinedAt: row.createdAt.getTime(),
      },
      stats: {
        eventsPlayed: entries.length,
        eventsHosted: Number(hosted[0]?.count ?? 0),
        wins,
        losses,
        draws,
        winRate: history.length === 0 ? 0 : wins / history.length,
        bestFinish: ranks.length === 0 ? null : Math.min(...ranks),
      },
      events: entries.map(({ event, finalRank }) => ({
        eventId: event.id,
        name: event.name,
        storeName: event.storeName,
        startsAt: event.startsAt.getTime(),
        status: event.status,
        finalRank,
        playerCount: counts.get(event.id) ?? 0,
        ...(perEvent.get(event.id) ?? { wins: 0, losses: 0, draws: 0 }),
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
          ...(input.image !== undefined ? { image: input.image } : {}),
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
      image: row.image,
      playerId: row.playerId,
      bio: row.bio,
    }
  })

  return { byUsername, updateMine, me }
})

export class ProfilesService extends Context.Service<ProfilesService, Effect.Success<typeof make>>()(
  'tcgrank/server/profiles/ProfilesService',
) {
  static readonly layer = Layer.effect(ProfilesService, make)
}
