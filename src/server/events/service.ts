import { and, desc, eq, inArray, like, or, sql } from 'drizzle-orm'
import { Clock, Context, Effect, Layer } from 'effect'
import { newId, newJoinCode, normalizeJoinCode } from '#/domain/ids.ts'
import { adjustClock, pauseClock, resumeClock, startClock } from '#/domain/match-clock.ts'
import { computeStandings, type Outcome } from '#/domain/standings.ts'
import { pairRound, recommendedRounds } from '#/domain/swiss.ts'
import type { CreateEventInput } from '#/shared/schemas.ts'
import { optionalUser, requireUser } from '../current-user.ts'
import { Db } from '../db/client.ts'
import {
  decks,
  eventPlayers,
  events,
  matches,
  rounds,
  user,
  type EventRow,
  type EventStatus,
  type MatchRow,
} from '../db/schema.ts'
import { Forbidden, InvalidState, NotFound } from '../errors.ts'
import {
  matchStatus,
  type EntrantView,
  type EventDetail,
  type EventSummary,
  type MatchView,
  type PlayerRef,
  type StandingView,
} from './views.ts'

const playerRefColumns = {
  id: user.id,
  name: user.name,
  username: user.username,
  image: user.image,
}

export const outcomeFromGames = (player1Games: number, player2Games: number): Outcome =>
  player1Games > player2Games ? 'p1' : player2Games > player1Games ? 'p2' : 'draw'

export interface ListEventsOptions {
  readonly scope: 'upcoming' | 'live' | 'finished' | 'mine'
  readonly search?: string | undefined
}

const make = Effect.gen(function* () {
  const db = yield* Db

  /* ----------------------------- loaders ----------------------------- */

  const loadEvent = Effect.fn('EventsService.loadEvent')(function* (eventId: string) {
    const row = yield* db.query((d) => d.query.events.findFirst({ where: eq(events.id, eventId) }))
    if (!row) return yield* new NotFound({ entity: 'Event', id: eventId })
    return row
  })

  const loadHostedEvent = Effect.fn('EventsService.loadHostedEvent')(function* (eventId: string) {
    const me = yield* requireUser
    const event = yield* loadEvent(eventId)
    if (event.hostId !== me.id) return yield* new Forbidden({ reason: 'Only the host can do that' })
    return event
  })

  const playerRefs = (ids: ReadonlyArray<string>) =>
    ids.length === 0
      ? Effect.succeed(new Map<string, PlayerRef>())
      : db
          .query((d) =>
            d
              .select(playerRefColumns)
              .from(user)
              .where(inArray(user.id, [...new Set(ids)])),
          )
          .pipe(Effect.map((rows) => new Map(rows.map((r) => [r.id, r]))))

  const toMatchView = (m: MatchRow, refs: Map<string, PlayerRef>): MatchView => ({
    id: m.id,
    roundNumber: m.roundNumber,
    table: m.table,
    player1: refs.get(m.player1Id) ?? unknownPlayer(m.player1Id),
    player2: m.player2Id ? (refs.get(m.player2Id) ?? unknownPlayer(m.player2Id)) : null,
    player1Games: m.player1Games,
    player2Games: m.player2Games,
    outcome: m.outcome,
    reportedById: m.reportedById,
    status: matchStatus(m),
  })

  const summaries = Effect.fn('EventsService.summaries')(function* (rows: ReadonlyArray<EventRow>) {
    if (rows.length === 0) return []
    const ids = rows.map((r) => r.id)
    const counts = yield* db.query((d) =>
      d
        .select({ eventId: eventPlayers.eventId, count: sql<number>`count(*)` })
        .from(eventPlayers)
        .where(inArray(eventPlayers.eventId, ids))
        .groupBy(eventPlayers.eventId),
    )
    const countByEvent = new Map(counts.map((c) => [c.eventId, Number(c.count)]))
    const hosts = yield* playerRefs(rows.map((r) => r.hostId))
    return rows.map((r): EventSummary => ({
      id: r.id,
      name: r.name,
      storeName: r.storeName,
      format: r.format,
      status: r.status,
      startsAt: r.startsAt.getTime(),
      currentRound: r.currentRound,
      plannedRounds: r.plannedRounds,
      playerCount: countByEvent.get(r.id) ?? 0,
      host: hosts.get(r.hostId) ?? unknownPlayer(r.hostId),
    }))
  })

  /* ----------------------------- queries ----------------------------- */

  const list = Effect.fn('EventsService.list')(function* (options: ListEventsOptions) {
    const me = yield* optionalUser
    const statusFor: Record<Exclude<ListEventsOptions['scope'], 'mine'>, EventStatus> = {
      upcoming: 'registration',
      live: 'running',
      finished: 'finished',
    }
    const search = options.search ? `%${options.search}%` : null
    const searchFilter = search ? or(like(events.name, search), like(events.storeName, search)) : undefined

    let scopeFilter
    if (options.scope === 'mine') {
      if (!me) return []
      const joined = db.drizzle
        .select({ id: eventPlayers.eventId })
        .from(eventPlayers)
        .where(eq(eventPlayers.userId, me.id))
      scopeFilter = or(eq(events.hostId, me.id), inArray(events.id, joined))
    } else {
      scopeFilter = eq(events.status, statusFor[options.scope])
    }

    const rows = yield* db.query((d) =>
      d
        .select()
        .from(events)
        .where(and(scopeFilter, searchFilter))
        .orderBy(options.scope === 'finished' || options.scope === 'mine' ? desc(events.startsAt) : events.startsAt)
        .limit(100),
    )
    return yield* summaries(rows)
  })

  const findByJoinCode = Effect.fn('EventsService.findByJoinCode')(function* (code: string) {
    const joinCode = normalizeJoinCode(code)
    const row = yield* db.query((d) => d.query.events.findFirst({ where: eq(events.joinCode, joinCode) }))
    if (!row) return yield* new NotFound({ entity: 'Event', id: joinCode })
    const [summary] = yield* summaries([row])
    return summary!
  })

  const detail = Effect.fn('EventsService.detail')(function* (eventId: string) {
    const me = yield* optionalUser
    const event = yield* loadEvent(eventId)
    const [entries, roundRows, matchRows] = yield* Effect.all(
      [
        db.query((d) =>
          d
            .select({
              ...playerRefColumns,
              deckId: eventPlayers.deckId,
              deckName: decks.name,
              droppedAtRound: eventPlayers.droppedAtRound,
              finalRank: eventPlayers.finalRank,
            })
            .from(eventPlayers)
            .innerJoin(user, eq(user.id, eventPlayers.userId))
            .leftJoin(decks, eq(decks.id, eventPlayers.deckId))
            .where(eq(eventPlayers.eventId, eventId))
            .orderBy(eventPlayers.joinedAt),
        ),
        db.query((d) => d.select().from(rounds).where(eq(rounds.eventId, eventId)).orderBy(rounds.number)),
        db.query((d) =>
          d.select().from(matches).where(eq(matches.eventId, eventId)).orderBy(matches.roundNumber, matches.table),
        ),
      ],
      { concurrency: 'unbounded' },
    )

    const refs = yield* playerRefs([
      event.hostId,
      ...matchRows.flatMap((m) => [m.player1Id, m.player2Id ?? m.player1Id]),
    ])
    for (const e of entries) refs.set(e.id, { id: e.id, name: e.name, username: e.username, image: e.image })

    const players: Array<EntrantView> = entries
    const matchViews = matchRows.map((m) => toMatchView(m, refs))
    const dropped = new Set(players.filter((p) => p.droppedAtRound !== null).map((p) => p.id))

    const standings: Array<StandingView> = computeStandings(
      players.map((p) => p.id),
      matchRows.filter((m) => m.confirmedAt !== null),
    ).map((s) => ({
      ...s,
      player: refs.get(s.playerId) ?? unknownPlayer(s.playerId),
      dropped: dropped.has(s.playerId),
    }))

    const [summary] = yield* summaries([event])
    const currentMatch = me
      ? (matchViews.find(
          (m) => m.roundNumber === event.currentRound && (m.player1.id === me.id || m.player2?.id === me.id),
        ) ?? null)
      : null

    const now = yield* Clock.currentTimeMillis
    return {
      event: {
        ...summary!,
        description: event.description,
        joinCode: event.joinCode,
        roundMinutes: event.roundMinutes,
        finishedAt: event.finishedAt?.getTime() ?? null,
      },
      players,
      rounds: roundRows.map((r) => ({
        id: r.id,
        number: r.number,
        status: r.status,
        startedAt: r.startedAt.getTime(),
        endsAt: r.endsAt?.getTime() ?? null,
        pausedRemainingMs: r.pausedRemainingMs,
      })),
      matches: matchViews,
      standings,
      viewer: me
        ? {
            userId: me.id,
            isHost: me.id === event.hostId,
            entry: players.find((p) => p.id === me.id) ?? null,
            currentMatch,
          }
        : null,
      serverNow: now,
    } satisfies EventDetail
  })

  /* ---------------------------- commands ----------------------------- */

  const create = Effect.fn('EventsService.create')(function* (input: CreateEventInput) {
    const me = yield* requireUser
    const id = newId()
    const joinCode = newJoinCode()
    yield* db.query((d) =>
      d.insert(events).values({
        id,
        hostId: me.id,
        name: input.name,
        storeName: input.storeName,
        description: input.description || null,
        format: input.format,
        plannedRounds: input.plannedRounds,
        roundMinutes: input.roundMinutes,
        startsAt: input.startsAt,
        joinCode,
      }),
    )
    return { id, joinCode }
  })

  const ownDeck = Effect.fn('EventsService.ownDeck')(function* (userId: string, deckId: string) {
    const deck = yield* db.query((d) =>
      d.query.decks.findFirst({ where: and(eq(decks.id, deckId), eq(decks.userId, userId)) }),
    )
    if (!deck) return yield* new NotFound({ entity: 'Deck', id: deckId })
    return deck
  })

  const join = Effect.fn('EventsService.join')(function* (eventId: string, deckId?: string | null) {
    const me = yield* requireUser
    const event = yield* loadEvent(eventId)
    if (event.status === 'finished') return yield* new InvalidState({ reason: 'This event has already finished' })
    if (deckId) yield* ownDeck(me.id, deckId)

    const existing = yield* db.query((d) =>
      d.query.eventPlayers.findFirst({
        where: and(eq(eventPlayers.eventId, eventId), eq(eventPlayers.userId, me.id)),
      }),
    )
    if (existing) {
      yield* db.query((d) =>
        d
          .update(eventPlayers)
          .set({ droppedAtRound: null, ...(deckId !== undefined ? { deckId } : {}) })
          .where(eq(eventPlayers.id, existing.id)),
      )
      return
    }
    yield* db.query((d) =>
      d.insert(eventPlayers).values({ id: newId(), eventId, userId: me.id, deckId: deckId ?? null }),
    )
  })

  const leave = Effect.fn('EventsService.leave')(function* (eventId: string) {
    const me = yield* requireUser
    const event = yield* loadEvent(eventId)
    const where = and(eq(eventPlayers.eventId, eventId), eq(eventPlayers.userId, me.id))
    if (event.status === 'registration') {
      yield* db.query((d) => d.delete(eventPlayers).where(where))
    } else {
      yield* db.query((d) => d.update(eventPlayers).set({ droppedAtRound: event.currentRound }).where(where))
    }
  })

  const assertRoundComplete = Effect.fn('EventsService.assertRoundComplete')(function* (event: EventRow) {
    if (event.currentRound === 0) return
    const pending = yield* db.query((d) =>
      d
        .select({ id: matches.id })
        .from(matches)
        .where(
          and(
            eq(matches.eventId, event.id),
            eq(matches.roundNumber, event.currentRound),
            sql`${matches.confirmedAt} is null`,
          ),
        ),
    )
    if (pending.length > 0) {
      return yield* new InvalidState({
        reason: `${pending.length} ${pending.length === 1 ? 'match is' : 'matches are'} still waiting for a confirmed result`,
      })
    }
  })

  const startNextRound = Effect.fn('EventsService.startNextRound')(function* (eventId: string) {
    const event = yield* loadHostedEvent(eventId)
    if (event.status === 'finished') return yield* new InvalidState({ reason: 'This event has already finished' })
    yield* assertRoundComplete(event)

    const entries = yield* db.query((d) => d.select().from(eventPlayers).where(eq(eventPlayers.eventId, eventId)))
    const active = entries.filter((e) => e.droppedAtRound === null).map((e) => e.userId)
    if (active.length < 2) return yield* new InvalidState({ reason: 'You need at least two players to pair a round' })

    const plannedRounds = event.plannedRounds > 0 ? event.plannedRounds : recommendedRounds(entries.length)
    const roundNumber = event.currentRound + 1
    if (event.currentRound >= plannedRounds) {
      return yield* new InvalidState({ reason: `All ${plannedRounds} Swiss rounds have been played` })
    }

    const history = yield* db.query((d) => d.select().from(matches).where(eq(matches.eventId, eventId)))
    const pairings = yield* pairRound({
      activePlayerIds: active,
      allPlayerIds: entries.map((e) => e.userId),
      matches: history,
    })

    const now = yield* Clock.currentTimeMillis
    const clock = startClock(now, event.roundMinutes)
    const roundId = newId()
    const startedAt = new Date(now)

    yield* db.query((d) =>
      d.batch([
        d
          .update(rounds)
          .set({ status: 'finished', finishedAt: startedAt })
          .where(and(eq(rounds.eventId, eventId), eq(rounds.status, 'active'))),
        d.insert(rounds).values({
          id: roundId,
          eventId,
          number: roundNumber,
          startedAt,
          endsAt: clock.endsAt === null ? null : new Date(clock.endsAt),
          pausedRemainingMs: clock.pausedRemainingMs,
        }),
        d.insert(matches).values(
          pairings.map((p) => ({
            id: newId(),
            eventId,
            roundId,
            roundNumber,
            table: p.table,
            player1Id: p.player1Id,
            player2Id: p.player2Id,
            ...(p.player2Id === null
              ? { outcome: 'bye' as const, player1Games: 2, reportedAt: startedAt, confirmedAt: startedAt }
              : {}),
          })),
        ),
        d
          .update(events)
          .set({ status: 'running', currentRound: roundNumber, plannedRounds })
          .where(eq(events.id, eventId)),
      ]),
    )
    return { roundNumber }
  })

  const finishEvent = Effect.fn('EventsService.finishEvent')(function* (eventId: string) {
    const event = yield* loadHostedEvent(eventId)
    if (event.status === 'finished') return
    if (event.currentRound === 0) return yield* new InvalidState({ reason: 'Play at least one round first' })
    yield* assertRoundComplete(event)

    const entries = yield* db.query((d) => d.select().from(eventPlayers).where(eq(eventPlayers.eventId, eventId)))
    const history = yield* db.query((d) => d.select().from(matches).where(eq(matches.eventId, eventId)))
    const standings = computeStandings(
      entries.map((e) => e.userId),
      history,
    )
    const now = new Date(yield* Clock.currentTimeMillis)
    yield* db.query((d) =>
      d.batch([
        d.update(rounds).set({ status: 'finished', finishedAt: now }).where(eq(rounds.eventId, eventId)),
        d.update(events).set({ status: 'finished', finishedAt: now }).where(eq(events.id, eventId)),
        ...standings.map((s) =>
          d
            .update(eventPlayers)
            .set({ finalRank: s.rank })
            .where(and(eq(eventPlayers.eventId, eventId), eq(eventPlayers.userId, s.playerId))),
        ),
      ]),
    )
  })

  const loadMatchForActor = Effect.fn('EventsService.loadMatchForActor')(function* (matchId: string) {
    const me = yield* requireUser
    const match = yield* db.query((d) => d.query.matches.findFirst({ where: eq(matches.id, matchId) }))
    if (!match) return yield* new NotFound({ entity: 'Match', id: matchId })
    const event = yield* loadEvent(match.eventId)
    const isHost = event.hostId === me.id
    const isPlayer = match.player1Id === me.id || match.player2Id === me.id
    if (!isHost && !isPlayer)
      return yield* new Forbidden({ reason: 'Only the players at this table or the host can report' })
    if (match.roundNumber !== event.currentRound || event.status !== 'running') {
      if (!isHost) return yield* new InvalidState({ reason: 'This round is closed — ask the host to correct it' })
    }
    if (match.player2Id === null) return yield* new InvalidState({ reason: 'Byes are scored automatically' })
    return { me, match, event, isHost }
  })

  const matchView = Effect.fn('EventsService.matchView')(function* (matchId: string) {
    const m = yield* db.query((d) => d.query.matches.findFirst({ where: eq(matches.id, matchId) }))
    if (!m) return yield* new NotFound({ entity: 'Match', id: matchId })
    const refs = yield* playerRefs([m.player1Id, m.player2Id ?? m.player1Id])
    return toMatchView(m, refs)
  })

  const reportResult = Effect.fn('EventsService.reportResult')(function* (
    matchId: string,
    player1Games: number,
    player2Games: number,
  ) {
    const { me, match, isHost } = yield* loadMatchForActor(matchId)
    const outcome = outcomeFromGames(player1Games, player2Games)
    const now = new Date(yield* Clock.currentTimeMillis)

    // The opponent submitting the very same score counts as confirmation.
    const agreesWithPending =
      match.outcome !== null &&
      match.confirmedAt === null &&
      match.reportedById !== null &&
      match.reportedById !== me.id &&
      match.player1Games === player1Games &&
      match.player2Games === player2Games

    yield* db.query((d) =>
      d
        .update(matches)
        .set({
          player1Games,
          player2Games,
          outcome,
          reportedById: agreesWithPending ? match.reportedById : me.id,
          reportedAt: now,
          confirmedAt: isHost || agreesWithPending ? now : null,
        })
        .where(eq(matches.id, matchId)),
    )
    return yield* matchView(matchId)
  })

  const confirmResult = Effect.fn('EventsService.confirmResult')(function* (matchId: string) {
    const { me, match, isHost } = yield* loadMatchForActor(matchId)
    if (match.outcome === null) return yield* new InvalidState({ reason: 'Nobody has reported this match yet' })
    if (match.confirmedAt !== null) return yield* matchView(matchId)
    if (!isHost && match.reportedById === me.id) {
      return yield* new InvalidState({ reason: 'Your opponent needs to confirm the result you reported' })
    }
    const now = new Date(yield* Clock.currentTimeMillis)
    yield* db.query((d) => d.update(matches).set({ confirmedAt: now }).where(eq(matches.id, matchId)))
    return yield* matchView(matchId)
  })

  const controlClock = Effect.fn('EventsService.controlClock')(function* (
    eventId: string,
    action: 'pause' | 'resume' | 'adjust',
    deltaMinutes = 0,
  ) {
    const event = yield* loadHostedEvent(eventId)
    const round = yield* db.query((d) =>
      d.query.rounds.findFirst({ where: and(eq(rounds.eventId, eventId), eq(rounds.number, event.currentRound)) }),
    )
    if (!round || round.status !== 'active') return yield* new InvalidState({ reason: 'No round is running' })
    const now = yield* Clock.currentTimeMillis
    const current = { endsAt: round.endsAt?.getTime() ?? null, pausedRemainingMs: round.pausedRemainingMs }
    const next =
      action === 'pause'
        ? pauseClock(current, now)
        : action === 'resume'
          ? resumeClock(current, now)
          : adjustClock(current, deltaMinutes * 60_000)
    yield* db.query((d) =>
      d
        .update(rounds)
        .set({ endsAt: next.endsAt === null ? null : new Date(next.endsAt), pausedRemainingMs: next.pausedRemainingMs })
        .where(eq(rounds.id, round.id)),
    )
  })

  const remove = Effect.fn('EventsService.remove')(function* (eventId: string) {
    const event = yield* loadHostedEvent(eventId)
    if (event.status !== 'registration') {
      return yield* new InvalidState({ reason: 'Events can only be deleted before the first round' })
    }
    yield* db.query((d) => d.delete(events).where(eq(events.id, eventId)))
  })

  return {
    create,
    list,
    detail,
    findByJoinCode,
    join,
    leave,
    startNextRound,
    finishEvent,
    reportResult,
    confirmResult,
    controlClock,
    remove,
  }
})

export class EventsService extends Context.Service<EventsService, Effect.Success<typeof make>>()(
  'tcgrank/server/events/EventsService',
) {
  static readonly layer = Layer.effect(EventsService, make)
}

const unknownPlayer = (id: string): PlayerRef => ({ id, name: 'Unknown player', username: null, image: null })
