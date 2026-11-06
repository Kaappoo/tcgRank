import { and, eq, inArray, or, sql } from 'drizzle-orm'
import { Effect } from 'effect'
import type { HistoryEvent, HistoryMatch } from '#/domain/achievements.ts'
import { Db } from '../db/client.ts'
import { eventPlayers, events, matches, rounds, user, type MatchRow } from '../db/schema.ts'

const resultOf = (playerId: string, m: MatchRow): HistoryMatch['result'] | null => {
  if (m.outcome === null) return null
  if (m.outcome === 'bye' || m.player2Id === null) return 'bye'
  if (m.outcome === 'draw') return 'draw'
  return (m.outcome === 'p1') === (m.player1Id === playerId) ? 'win' : 'loss'
}

/** A player's full history for the achievement rules: every event they entered or hosted. */
export const loadHistory = Effect.fn('loadHistory')(function* (userId: string) {
  const db = yield* Db
  const [entries, hostedRows] = yield* Effect.all(
    [
      db.query((d) =>
        d
          .select({ event: events, entry: eventPlayers })
          .from(eventPlayers)
          .innerJoin(events, eq(events.id, eventPlayers.eventId))
          .where(eq(eventPlayers.userId, userId)),
      ),
      db.query((d) => d.select().from(events).where(eq(events.hostId, userId))),
    ],
    { concurrency: 'unbounded' },
  )
  const eventRows = new Map([
    ...hostedRows.map((e) => [e.id, e] as const),
    ...entries.map((e) => [e.event.id, e.event] as const),
  ])
  const eventIds = [...eventRows.keys()]
  if (eventIds.length === 0) return []

  const [counts, matchRows] = yield* Effect.all(
    [
      db.query((d) =>
        d
          .select({
            eventId: eventPlayers.eventId,
            players: sql<number>`count(*)`,
            accounts: sql<number>`sum(case when ${user.isGuest} then 0 else 1 end)`,
          })
          .from(eventPlayers)
          .innerJoin(user, eq(user.id, eventPlayers.userId))
          .where(inArray(eventPlayers.eventId, eventIds))
          .groupBy(eventPlayers.eventId),
      ),
      db.query((d) =>
        d
          .select({ match: matches, elimination: rounds.elimination })
          .from(matches)
          .innerJoin(rounds, eq(rounds.id, matches.roundId))
          .where(
            and(inArray(matches.eventId, eventIds), or(eq(matches.player1Id, userId), eq(matches.player2Id, userId))),
          ),
      ),
    ],
    { concurrency: 'unbounded' },
  )
  const countBy = new Map(counts.map((c) => [c.eventId, c]))
  const entryBy = new Map(entries.map((e) => [e.event.id, e.entry]))

  return eventIds.map((id): HistoryEvent => {
    const event = eventRows.get(id)!
    const entry = entryBy.get(id)
    return {
      id,
      status: event.status,
      finishedAt: event.finishedAt?.getTime() ?? null,
      format: event.format,
      bestOf: event.bestOf,
      playerCount: Number(countBy.get(id)?.players ?? 0),
      accountCount: Number(countBy.get(id)?.accounts ?? 0),
      rounds: event.currentRound,
      topCut: event.topCut,
      hosted: event.hostId === userId,
      entry: entry
        ? {
            droppedAtRound: entry.droppedAtRound,
            finalRank: entry.finalRank,
            deckId: entry.deckId,
            matches: matchRows
              .filter(({ match }) => match.eventId === id)
              .flatMap(({ match, elimination }) => {
                const result = resultOf(userId, match)
                if (!result) return []
                const asP1 = match.player1Id === userId
                return [
                  {
                    roundNumber: match.roundNumber,
                    opponentId: asP1 ? match.player2Id : match.player1Id,
                    result,
                    gamesWon: asP1 ? match.player1Games : match.player2Games,
                    gamesLost: asP1 ? match.player2Games : match.player1Games,
                    confirmed: match.confirmedAt !== null,
                    elimination,
                  },
                ]
              }),
          }
        : null,
    }
  })
})

/** The running events a player is entered in (with whether they dropped) and the running events they host. */
export const loadLiveEvents = Effect.fn('loadLiveEvents')(function* (userId: string) {
  const db = yield* Db
  const [entries, hosted] = yield* Effect.all(
    [
      db.query((d) =>
        d
          .select({ status: events.status, droppedAtRound: eventPlayers.droppedAtRound })
          .from(eventPlayers)
          .innerJoin(events, eq(events.id, eventPlayers.eventId))
          .where(and(eq(eventPlayers.userId, userId), eq(events.status, 'running'))),
      ),
      db.query((d) =>
        d
          .select({ status: events.status })
          .from(events)
          .where(and(eq(events.hostId, userId), eq(events.status, 'running'))),
      ),
    ],
    { concurrency: 'unbounded' },
  )
  return { entries: entries.map((e) => ({ status: e.status, dropped: e.droppedAtRound !== null })), hosted }
})
