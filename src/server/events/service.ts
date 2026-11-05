import { and, desc, eq, inArray, isNull, like, or, sql } from 'drizzle-orm'
import { Clock, Context, Effect, Layer, Random } from 'effect'
import { invalidScoreReason, majority, matchOutcome, scoreRules, type BestOf } from '#/domain/best-of.ts'
import {
  eventBracket,
  finalRound,
  firstBracketRound,
  lostByDrop,
  nextBracketRound,
  type BracketPairing,
} from '#/domain/bracket.ts'
import { newId, newJoinCode, normalizeJoinCode } from '#/domain/ids.ts'
import { allowedCutSizes, mainPhaseRounds, type PairingSystem, type TopCutSize } from '#/domain/event-setup.ts'
import { bracketPlacements, placedStandings, standingsMatches } from '#/domain/placement.ts'
import { eventProgress, nextRoundRefusal } from '#/domain/progress.ts'
import { entriesClosedReason } from '#/domain/open-entry.ts'
import { deckIneligibility } from '#/domain/registration.ts'
import { adjustClock, pauseClock, resumeClock, startClock } from '#/domain/match-clock.ts'
import { scheduleRound } from '#/domain/round-robin.ts'
import { computeStandings, tiebreakersFor } from '#/domain/standings.ts'
import { pairRound, type Pairing } from '#/domain/swiss.ts'
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
  type EventPlayerRow,
  type EventStatus,
  type MatchRow,
} from '../db/schema.ts'
import { CodeRequired, Forbidden, InvalidState, NotFound } from '../errors.ts'
import {
  matchStatus,
  type EntrantView,
  type EventDetail,
  type GuestView,
  type EventSummary,
  type MatchView,
  type PlayerRef,
  type StandingView,
} from './views.ts'

const TOP_CUT_SWISS_ONLY = 'Only Swiss events can have a top cut'

/**
 * Standings as shown: the live standings, placed by `placedStandings` (the top cut first while it is played, the stored
 * placement once finished), with each player's name and whether they dropped.
 */
const standingsView = (
  event: EventRow,
  players: ReadonlyArray<EntrantView>,
  matchRows: ReadonlyArray<MatchRow>,
  refs: ReadonlyMap<string, PlayerRef>,
): Array<StandingView> => {
  const live = computeStandings(
    players.map((p) => p.id),
    standingsMatches(event, matchRows),
    { tiebreakers: tiebreakersFor(event.pairingSystem) },
  )
  return placedStandings(event, live, players, matchRows).map((s) => ({
    ...s,
    player: refs.get(s.playerId) ?? unknownPlayer(s.playerId),
    dropped: players.some((p) => p.id === s.playerId && p.droppedAtRound !== null),
  }))
}

/** Minutes on a round's clock: a top cut's rounds run on the timer set at the cut, every other round on the event's. */
const roundTimer = (
  event: Pick<EventRow, 'roundMinutes' | 'topCutSize' | 'topCutRoundMinutes'>,
  elimination: boolean,
): number =>
  elimination && event.topCutSize !== null ? (event.topCutRoundMinutes ?? event.roundMinutes) : event.roundMinutes

/** The pairings for the next round, plus what round 1 draws: a round-robin schedule or bracket seeds. */
interface NextRound {
  readonly pairings: ReadonlyArray<Pairing | BracketPairing>
  readonly elimination: boolean
  /** Player ids in schedule-position order; empty unless round 1 of a round robin. */
  readonly schedule: ReadonlyArray<string>
  /** Player ids in seed order; empty unless round 1 of a bracket. */
  readonly seeds: ReadonlyArray<string>
}

/** A next round with nothing drawn unless `draws` says so. */
const nextRound = (
  pairings: NextRound['pairings'],
  elimination: boolean,
  draws: Partial<Pick<NextRound, 'schedule' | 'seeds'>> = {},
): NextRound => ({ pairings, elimination, schedule: draws.schedule ?? [], seeds: draws.seeds ?? [] })

const playerRefColumns = {
  id: user.id,
  name: user.name,
  username: user.username,
  image: user.image,
}

interface DetailOptions {
  /** The join code, for someone opening a private event they have not entered. */
  readonly code?: string | undefined
}

interface ListEventsOptions {
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

  /** Reads drops from the players' `droppedAtRound`, in elimination rounds of an event played to `bestOf`. */
  const toMatchView = (
    m: MatchRow,
    refs: Map<string, PlayerRef>,
    drops: { droppedAtRound: ReadonlyMap<string, number | null>; elimination: boolean; bestOf: BestOf },
  ): MatchView => ({
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
    bracketSlot: m.bracketSlot,
    dropped:
      drops.elimination && lostByDrop(m, (id) => drops.droppedAtRound.get(id) ?? null, majority(drops.bestOf)),
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
      deckRequired: r.deckRequired,
      isPrivate: r.isPrivate,
      bestOf: r.bestOf,
      pairingSystem: r.pairingSystem,
      topCut: r.topCut,
      topCutSize: r.topCutSize,
      entriesClosedReason: entriesClosedReason(r),
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
      scopeFilter = and(eq(events.status, statusFor[options.scope]), eq(events.isPrivate, false))
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

  /** A private event opens for its host, its entrants (dropped ones too) and anyone holding its join code. */
  const assertCanView = Effect.fn('EventsService.assertCanView')(function* (
    event: EventRow,
    meId: string | null,
    code: string | undefined,
  ) {
    if (!event.isPrivate || meId === event.hostId) return
    if (code !== undefined && normalizeJoinCode(code) === event.joinCode) return
    if (meId) {
      const entry = yield* db.query((d) =>
        d.query.eventPlayers.findFirst({
          where: and(eq(eventPlayers.eventId, event.id), eq(eventPlayers.userId, meId)),
          columns: { userId: true },
        }),
      )
      if (entry) return
    }
    return yield* new CodeRequired()
  })

  const detail = Effect.fn('EventsService.detail')(function* (eventId: string, options: DetailOptions = {}) {
    const me = yield* optionalUser
    const event = yield* loadEvent(eventId)
    yield* assertCanView(event, me?.id ?? null, options.code)
    const [entries, roundRows, matchRows] = yield* Effect.all(
      [
        db.query((d) =>
          d
            .select({
              ...playerRefColumns,
              isGuest: user.isGuest,
              deckId: eventPlayers.deckId,
              deckName: decks.name,
              droppedAtRound: eventPlayers.droppedAtRound,
              finalRank: eventPlayers.finalRank,
              seed: eventPlayers.seed,
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
    const droppedAtRound = new Map(entries.map((e) => [e.id, e.droppedAtRound]))
    const eliminationRounds = new Set(roundRows.filter((r) => r.elimination).map((r) => r.id))
    const matchViews = matchRows.map((m) =>
      toMatchView(m, refs, { droppedAtRound, elimination: eliminationRounds.has(m.roundId), bestOf: event.bestOf }),
    )
    const standings = standingsView(event, players, matchRows, refs)
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
        topCutRoundMinutes: event.topCutRoundMinutes,
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
        elimination: r.elimination,
        minutes: roundTimer(event, r.elimination),
      })),
      matches: matchViews,
      standings,
      progress: eventProgress(event, entries.length),
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
    if (input.topCut && input.pairingSystem !== 'swiss') return yield* new InvalidState({ reason: TOP_CUT_SWISS_ONLY })
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
        // Only Swiss takes a round count from the host; the other systems fix theirs at round 1.
        plannedRounds: input.pairingSystem === 'swiss' ? input.plannedRounds : 0,
        roundMinutes: input.roundMinutes,
        startsAt: input.startsAt,
        deckRequired: input.deckRequired,
        bestOf: input.bestOf,
        pairingSystem: input.pairingSystem,
        topCut: input.topCut,
        isPrivate: input.isPrivate,
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

  /**
   * Enters the event, or changes the entry's registered deck. `undefined` keeps
   * the current deck; `null` registers none, which events that require a deck
   * refuse. Once round 1 starts a registered deck is locked.
   */
  /** `code`: the join code, needed to enter a private event the player is not already in. */
  const join = Effect.fn('EventsService.join')(function* (eventId: string, deckId?: string | null, code?: string) {
    const me = yield* requireUser
    const event = yield* loadEvent(eventId)
    if (event.status === 'finished') return yield* new InvalidState({ reason: 'This event has already finished' })
    if (deckId) {
      const deck = yield* ownDeck(me.id, deckId)
      const ineligible = event.deckRequired ? deckIneligibility(deck, event.format) : null
      if (ineligible) return yield* new InvalidState({ reason: `${deck.name} can't be registered: ${ineligible}` })
    }

    const existing = yield* db.query((d) =>
      d.query.eventPlayers.findFirst({
        where: and(eq(eventPlayers.eventId, eventId), eq(eventPlayers.userId, me.id)),
      }),
    )
    if (!existing) yield* assertCanView(event, me.id, code)
    // A player still in the event may fill in a missing deck; anyone else needs open entry.
    const closed = existing?.droppedAtRound === null ? null : entriesClosedReason(event)
    if (closed) return yield* new InvalidState({ reason: closed })
    const registered = deckId !== undefined ? deckId : (existing?.deckId ?? null)
    if (event.deckRequired && registered === null) {
      return yield* new InvalidState({ reason: 'This event requires a registered deck' })
    }
    if (existing?.deckId && event.status !== 'registration' && registered !== existing.deckId) {
      return yield* new InvalidState({ reason: 'Registered decks are locked once round 1 starts' })
    }
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

  /** Host-only: hide the event from everyone but its entrants and holders of the join code. Allowed at any time. */
  const setPrivate = Effect.fn('EventsService.setPrivate')(function* (eventId: string, isPrivate: boolean) {
    yield* loadHostedEvent(eventId)
    yield* db.query((d) => d.update(events).set({ isPrivate }).where(eq(events.id, eventId)))
  })

  /** Host-only: whether entering needs a registered deck. Fixed once round 1 starts. */
  const setDeckRequired = Effect.fn('EventsService.setDeckRequired')(function* (
    eventId: string,
    deckRequired: boolean,
  ) {
    const event = yield* loadHostedEvent(eventId)
    if (event.status !== 'registration') {
      return yield* new InvalidState({ reason: 'Deck registration can only change before round 1' })
    }
    yield* db.query((d) => d.update(events).set({ deckRequired }).where(eq(events.id, eventId)))
  })

  /** Host-only: how many games a match runs to. Fixed once round 1 starts, so reported scores keep their meaning. */
  const setBestOf = Effect.fn('EventsService.setBestOf')(function* (eventId: string, bestOf: BestOf) {
    const event = yield* loadHostedEvent(eventId)
    if (event.status !== 'registration') {
      return yield* new InvalidState({ reason: 'Best of can only change before round 1' })
    }
    yield* db.query((d) => d.update(events).set({ bestOf }).where(eq(events.id, eventId)))
  })

  /**
   * Host-only: how rounds are built. Fixed once round 1 is paired. Leaving Swiss turns the top cut off and drops a
   * hand-set round count, which only Swiss takes.
   */
  const setPairingSystem = Effect.fn('EventsService.setPairingSystem')(function* (
    eventId: string,
    pairingSystem: PairingSystem,
  ) {
    const event = yield* loadHostedEvent(eventId)
    if (event.status !== 'registration') {
      return yield* new InvalidState({ reason: 'The pairing system is fixed once round 1 is paired' })
    }
    const leavingSwiss = pairingSystem !== 'swiss'
    yield* db.query((d) =>
      d
        .update(events)
        .set({ pairingSystem, ...(leavingSwiss ? { topCut: false, plannedRounds: 0 } : {}) })
        .where(eq(events.id, eventId)),
    )
  })

  /** Host-only: whether a Swiss event cuts to a bracket after its Swiss rounds. Fixed once round 1 is paired. */
  const setTopCut = Effect.fn('EventsService.setTopCut')(function* (eventId: string, topCut: boolean) {
    const event = yield* loadHostedEvent(eventId)
    if (event.status !== 'registration') {
      return yield* new InvalidState({ reason: 'The top cut is fixed once round 1 is paired' })
    }
    if (topCut && event.pairingSystem !== 'swiss') return yield* new InvalidState({ reason: TOP_CUT_SWISS_ONLY })
    yield* db.query((d) => d.update(events).set({ topCut }).where(eq(events.id, eventId)))
  })

  /* ------------------------------ guests ----------------------------- */

  /**
   * Host-only: enters a player who has no account (or no phone). Either a new
   * guest by name, or one from the host's guest list. Guests skip deck
   * registration and may be added whenever a player could join.
   */
  const addGuest = Effect.fn('EventsService.addGuest')(function* (
    eventId: string,
    who: { readonly name: string } | { readonly guestId: string },
  ) {
    const me = yield* requireUser
    const event = yield* loadHostedEvent(eventId)
    if (event.status === 'finished') return yield* new InvalidState({ reason: 'This event has already finished' })
    const closed = entriesClosedReason(event)
    if (closed) return yield* new InvalidState({ reason: closed })

    let guest: { id: string; name: string }
    if ('guestId' in who) {
      const row = yield* db.query((d) =>
        d.query.user.findFirst({
          where: and(eq(user.id, who.guestId), eq(user.isGuest, true), eq(user.guestOfId, me.id)),
        }),
      )
      if (!row) return yield* new NotFound({ entity: 'Guest', id: who.guestId })
      guest = row
    } else {
      const name = who.name.trim()
      const clash = yield* db.query((d) =>
        d.query.user.findFirst({
          where: and(eq(user.guestOfId, me.id), eq(user.isGuest, true), eq(sql`lower(${user.name})`, name.toLowerCase())),
        }),
      )
      if (clash) {
        return yield* new InvalidState({ reason: `You already have a guest called ${clash.name}: pick them from the list` })
      }
      const id = newId()
      // Guests never sign in: the address is unroutable (.invalid) and there is no password.
      yield* db.query((d) =>
        d.insert(user).values({
          id,
          name,
          email: `${id}@guests.tcgrank.invalid`,
          isGuest: true,
          guestOfId: me.id,
          claimCode: `${newId()}${newId()}`,
        }),
      )
      guest = { id, name }
    }

    const existing = yield* db.query((d) =>
      d.query.eventPlayers.findFirst({
        where: and(eq(eventPlayers.eventId, eventId), eq(eventPlayers.userId, guest.id)),
      }),
    )
    if (existing && existing.droppedAtRound === null) {
      return yield* new InvalidState({ reason: `${guest.name} is already in this event` })
    }
    yield* db.query((d) =>
      existing
        ? d.update(eventPlayers).set({ droppedAtRound: null }).where(eq(eventPlayers.id, existing.id))
        : d.insert(eventPlayers).values({ id: newId(), eventId, userId: guest.id }),
    )
    return { guestId: guest.id }
  })

  /**
   * A player who drops during an elimination match that has no confirmed result loses it: the match is recorded and
   * confirmed as the opponent's win, with the games as they stand (or as reported), so the round can close.
   */
  const forfeitOnDrop = Effect.fn('EventsService.forfeitOnDrop')(function* (event: EventRow, userId: string) {
    if (event.status !== 'running') return
    const [open] = yield* db.query((d) =>
      d
        .select({ id: matches.id, player1Id: matches.player1Id })
        .from(matches)
        .innerJoin(rounds, eq(rounds.id, matches.roundId))
        .where(
          and(
            eq(matches.eventId, event.id),
            eq(matches.roundNumber, event.currentRound),
            eq(rounds.elimination, true),
            isNull(matches.confirmedAt),
            or(eq(matches.player1Id, userId), eq(matches.player2Id, userId)),
          ),
        ),
    )
    if (!open) return
    const now = new Date(yield* Clock.currentTimeMillis)
    yield* db.query((d) =>
      d
        .update(matches)
        .set({
          outcome: open.player1Id === userId ? 'p2' : 'p1',
          reportedById: null,
          reportedAt: now,
          confirmedAt: now,
        })
        .where(eq(matches.id, open.id)),
    )
  })

  /** Host-only: takes a guest out, like leaving: removed before round 1, dropped after. */
  const removeGuest = Effect.fn('EventsService.removeGuest')(function* (eventId: string, guestId: string) {
    const event = yield* loadHostedEvent(eventId)
    if (event.status === 'finished') return yield* new InvalidState({ reason: 'This event has already finished' })
    const [entry] = yield* db.query((d) =>
      d
        .select({ id: eventPlayers.id })
        .from(eventPlayers)
        .innerJoin(user, eq(user.id, eventPlayers.userId))
        .where(and(eq(eventPlayers.eventId, eventId), eq(eventPlayers.userId, guestId), eq(user.isGuest, true))),
    )
    if (!entry) return yield* new NotFound({ entity: 'Guest', id: guestId })
    yield* forfeitOnDrop(event, guestId)
    yield* db.query((d) =>
      event.status === 'registration'
        ? d.delete(eventPlayers).where(eq(eventPlayers.id, entry.id))
        : d.update(eventPlayers).set({ droppedAtRound: event.currentRound }).where(eq(eventPlayers.id, entry.id)),
    )
  })

  /** The signed-in host's guest list, with the code each guest can claim their results with. */
  const guests = Effect.fn('EventsService.guests')(function* () {
    const me = yield* requireUser
    const rows = yield* db.query((d) =>
      d
        .select({
          id: user.id,
          name: user.name,
          claimCode: user.claimCode,
          eventCount: sql<number>`count(${eventPlayers.id})`,
        })
        .from(user)
        .leftJoin(eventPlayers, eq(eventPlayers.userId, user.id))
        .where(and(eq(user.guestOfId, me.id), eq(user.isGuest, true)))
        .groupBy(user.id)
        .orderBy(user.name),
    )
    return rows.map((r): GuestView => ({ ...r, claimCode: r.claimCode ?? '', eventCount: Number(r.eventCount) }))
  })

  const loadGuestByClaimCode = Effect.fn('EventsService.loadGuestByClaimCode')(function* (code: string) {
    const guest = yield* db.query((d) =>
      d.query.user.findFirst({ where: and(eq(user.claimCode, code), eq(user.isGuest, true)) }),
    )
    if (!guest) return yield* new NotFound({ entity: 'Guest', id: code })
    return guest
  })

  /** What a claim link would bring over, for the page that asks to accept it. */
  const claimPreview = Effect.fn('EventsService.claimPreview')(function* (code: string) {
    const guest = yield* loadGuestByClaimCode(code)
    const [hosts, [count]] = yield* Effect.all([
      playerRefs(guest.guestOfId ? [guest.guestOfId] : []),
      db.query((d) =>
        d.select({ n: sql<number>`count(*)` }).from(eventPlayers).where(eq(eventPlayers.userId, guest.id)),
      ),
    ])
    return {
      name: guest.name,
      hostName: guest.guestOfId ? (hosts.get(guest.guestOfId)?.name ?? null) : null,
      eventCount: Number(count?.n ?? 0),
    }
  })

  /**
   * Moves a guest's entries and matches to the signed-in player and deletes the
   * guest. Refused when both played in the same event: one person can't hold
   * two entries.
   */
  const claimGuest = Effect.fn('EventsService.claimGuest')(function* (code: string) {
    const me = yield* requireUser
    const guest = yield* loadGuestByClaimCode(code)
    if (guest.guestOfId === me.id) {
      return yield* new InvalidState({ reason: `${guest.name} is a guest you added: send them this link to claim it` })
    }
    const shared = yield* db.query((d) =>
      d
        .select({ name: events.name })
        .from(eventPlayers)
        .innerJoin(events, eq(events.id, eventPlayers.eventId))
        .where(inArray(eventPlayers.userId, [guest.id, me.id]))
        .groupBy(eventPlayers.eventId)
        .having(sql`count(distinct ${eventPlayers.userId}) = 2`),
    )
    if (shared.length > 0) {
      return yield* new InvalidState({
        reason: `You and ${guest.name} both played in ${shared[0]!.name}, so these results can't be merged. Ask the host.`,
      })
    }
    const [count] = yield* db.query((d) =>
      d.select({ n: sql<number>`count(*)` }).from(eventPlayers).where(eq(eventPlayers.userId, guest.id)),
    )
    yield* db.query((d) =>
      d.batch([
        d.update(eventPlayers).set({ userId: me.id }).where(eq(eventPlayers.userId, guest.id)),
        d.update(matches).set({ player1Id: me.id }).where(eq(matches.player1Id, guest.id)),
        d.update(matches).set({ player2Id: me.id }).where(eq(matches.player2Id, guest.id)),
        d.update(matches).set({ reportedById: me.id }).where(eq(matches.reportedById, guest.id)),
        d.delete(user).where(eq(user.id, guest.id)),
      ]),
    )
    return { eventCount: Number(count?.n ?? 0) }
  })

  const leave = Effect.fn('EventsService.leave')(function* (eventId: string) {
    const me = yield* requireUser
    const event = yield* loadEvent(eventId)
    const where = and(eq(eventPlayers.eventId, eventId), eq(eventPlayers.userId, me.id))
    if (event.status === 'registration') {
      yield* db.query((d) => d.delete(eventPlayers).where(where))
    } else {
      yield* forfeitOnDrop(event, me.id)
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

  /** Everyone who entered plus every match so far — the inputs to pairing and standings. */
  const loadEntriesAndHistory = (eventId: string) =>
    Effect.all(
      [
        db.query((d) => d.select().from(eventPlayers).where(eq(eventPlayers.eventId, eventId))),
        db.query((d) => d.select().from(matches).where(eq(matches.eventId, eventId))),
      ],
      { concurrency: 'unbounded' },
    )

  /**
   * The pairings for the next round under the event's pairing system. Round 1 of a round robin draws the schedule and
   * round 1 of a bracket draws the seeds, returned so they can be stored (and entries close with them).
   */
  const pairNextRound = Effect.fn('EventsService.pairNextRound')(function* (
    event: EventRow,
    entries: ReadonlyArray<EventPlayerRow>,
    history: ReadonlyArray<MatchRow>,
    roundNumber: number,
  ): Effect.fn.Return<NextRound> {
    const dropped = new Set(entries.filter((e) => e.droppedAtRound !== null).map((e) => e.userId))
    const nextOfBracket = (): NextRound => {
      const previous = history.flatMap((m) =>
        m.roundNumber === event.currentRound && m.bracketSlot !== null ? [{ ...m, slot: m.bracketSlot }] : [],
      )
      // A top cut never has byes: a player who dropped between its rounds loses by walkover instead.
      const onDrop = event.topCutSize === null ? 'bye' : 'walkover'
      return nextRound(nextBracketRound(previous, dropped, { onDrop }), true)
    }
    switch (event.pairingSystem) {
      case 'swiss': {
        if (event.topCutSize !== null) return nextOfBracket()
        const pairings: ReadonlyArray<Pairing> = yield* pairRound({
          activePlayerIds: entries.filter((e) => !dropped.has(e.userId)).map((e) => e.userId),
          allPlayerIds: entries.map((e) => e.userId),
          matches: history,
        })
        return nextRound(pairings, false)
      }
      case 'round_robin': {
        if (event.currentRound === 0) {
          const schedule = [...(yield* Random.shuffle(entries.map((e) => e.userId)))]
          return nextRound(scheduleRound({ schedule, round: roundNumber, dropped }), false, { schedule })
        }
        const schedule = entries
          .filter((e) => e.schedulePosition !== null)
          .sort((a, b) => a.schedulePosition! - b.schedulePosition!)
          .map((e) => e.userId)
        return nextRound(scheduleRound({ schedule, round: roundNumber, dropped }), false)
      }
      case 'single_elimination': {
        if (event.currentRound === 0) {
          const seeds = [...(yield* Random.shuffle(entries.filter((e) => !dropped.has(e.userId)).map((e) => e.userId)))]
          return nextRound(firstBracketRound(seeds), true, { seeds })
        }
        return nextOfBracket()
      }
    }
  })

  /**
   * Stores a paired round in one batch: closes the active round, starts the new one on a clock of `roundMinutes`,
   * inserts its matches (byes and walkovers confirmed at once) and whatever round 1 or the cut draws, and moves the event on.
   */
  const storeRound = Effect.fn('EventsService.storeRound')(function* (
    eventId: string,
    roundNumber: number,
    { pairings, elimination, schedule, seeds }: NextRound,
    roundMinutes: number,
    eventChanges: Partial<Pick<EventRow, 'plannedRounds' | 'topCutSize' | 'topCutRoundMinutes'>>,
  ) {
    const now = yield* Clock.currentTimeMillis
    const clock = startClock(now, roundMinutes)
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
          elimination,
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
            bracketSlot: 'slot' in p ? p.slot : null,
            ...(p.player2Id === null
              ? { outcome: 'bye' as const, player1Games: 2, reportedAt: startedAt, confirmedAt: startedAt }
              : {}),
            ...('walkover' in p && p.walkover ? { outcome: p.walkover, reportedAt: startedAt, confirmedAt: startedAt } : {}),
          })),
        ),
        d
          .update(events)
          .set({ status: 'running', currentRound: roundNumber, ...eventChanges })
          .where(eq(events.id, eventId)),
        ...schedule.map((userId, position) =>
          d
            .update(eventPlayers)
            .set({ schedulePosition: position + 1 })
            .where(and(eq(eventPlayers.eventId, eventId), eq(eventPlayers.userId, userId))),
        ),
        ...seeds.map((userId, index) =>
          d
            .update(eventPlayers)
            .set({ seed: index + 1 })
            .where(and(eq(eventPlayers.eventId, eventId), eq(eventPlayers.userId, userId))),
        ),
      ]),
    )
    return { roundNumber }
  })

  const startNextRound = Effect.fn('EventsService.startNextRound')(function* (eventId: string) {
    const event = yield* loadHostedEvent(eventId)
    if (event.status === 'finished') return yield* new InvalidState({ reason: 'This event has already finished' })
    yield* assertRoundComplete(event)

    const [entries, history] = yield* loadEntriesAndHistory(eventId)
    const active = entries.filter((e) => e.droppedAtRound === null).map((e) => e.userId)
    if (active.length < 2) return yield* new InvalidState({ reason: 'You need at least two players to pair a round' })

    const plannedRounds = mainPhaseRounds({ ...event, playerCount: entries.length })
    const roundNumber = event.currentRound + 1
    const refusal = nextRoundRefusal(event, plannedRounds)
    if (refusal) return yield* new InvalidState({ reason: refusal })

    const next = yield* pairNextRound(event, entries, history, roundNumber)
    if (next.pairings.length === 0) return yield* new InvalidState({ reason: 'Nobody is left to pair' })
    return yield* storeRound(eventId, roundNumber, next, roundTimer(event, next.elimination), { plannedRounds })
  })

  /**
   * Host-only: cuts a Swiss event to its top players once the last Swiss round is confirmed. Seeds the top `size`
   * players who haven't dropped by Swiss rank, closes entries (the cut size is set) and pairs the first elimination
   * round, numbered on from the Swiss rounds and timed by `roundMinutes`.
   */
  const cutToTop = Effect.fn('EventsService.cutToTop')(function* (
    eventId: string,
    size: TopCutSize,
    roundMinutes: number,
  ) {
    const event = yield* loadHostedEvent(eventId)
    if (event.pairingSystem !== 'swiss' || !event.topCut) {
      return yield* new InvalidState({ reason: 'This event has no top cut' })
    }
    if (event.status === 'finished') return yield* new InvalidState({ reason: 'This event has already finished' })
    if (event.topCutSize !== null) return yield* new InvalidState({ reason: 'The top cut has already started' })
    const [entries, history] = yield* loadEntriesAndHistory(eventId)
    const plannedRounds = mainPhaseRounds({ ...event, playerCount: entries.length })
    if (event.currentRound < plannedRounds) {
      return yield* new InvalidState({ reason: `Play all ${plannedRounds} Swiss rounds first` })
    }
    yield* assertRoundComplete(event)

    const active = new Set(entries.filter((e) => e.droppedAtRound === null).map((e) => e.userId))
    if (!allowedCutSizes(active.size).includes(size)) {
      return yield* new InvalidState({ reason: `A top ${size} needs ${size} players who haven’t dropped` })
    }
    const swissRank = computeStandings(
      entries.map((e) => e.userId),
      standingsMatches(event, history),
    ).map((s) => s.playerId)
    const seeds = swissRank.filter((id) => active.has(id)).slice(0, size)
    return yield* storeRound(
      eventId,
      event.currentRound + 1,
      nextRound(firstBracketRound(seeds), true, { seeds }),
      roundMinutes,
      { plannedRounds, topCutSize: size, topCutRoundMinutes: roundMinutes },
    )
  })

  const finishEvent = Effect.fn('EventsService.finishEvent')(function* (eventId: string) {
    const event = yield* loadHostedEvent(eventId)
    if (event.status === 'finished') return
    if (event.currentRound === 0) return yield* new InvalidState({ reason: 'Play at least one round first' })
    yield* assertRoundComplete(event)
    const bracket = eventBracket(event)
    if (bracket && event.currentRound < finalRound(bracket)) {
      return yield* new InvalidState({ reason: 'Play the bracket to its final first' })
    }

    const [entries, history] = yield* loadEntriesAndHistory(eventId)
    const standings = computeStandings(
      entries.map((e) => e.userId),
      standingsMatches(event, history),
      { tiebreakers: tiebreakersFor(event.pairingSystem) },
    )
    // Under a bracket, final standings follow placement; otherwise they are the standings.
    const placements = bracket
      ? bracketPlacements(
          bracket,
          entries.map((e) => ({ id: e.userId, droppedAtRound: e.droppedAtRound })),
          history,
          standings.map((s) => s.playerId),
        ).placements
      : new Map<string, number>()
    const now = new Date(yield* Clock.currentTimeMillis)
    yield* db.query((d) =>
      d.batch([
        d.update(rounds).set({ status: 'finished', finishedAt: now }).where(eq(rounds.eventId, eventId)),
        d.update(events).set({ status: 'finished', finishedAt: now }).where(eq(events.id, eventId)),
        ...standings.map((s) =>
          d
            .update(eventPlayers)
            .set({ finalRank: placements.get(s.playerId) ?? s.rank })
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

  /** A guest has no phone to confirm with, so a report against one counts straight away. */
  const reportsAgainstGuest = Effect.fn('EventsService.reportsAgainstGuest')(function* (match: MatchRow, meId: string) {
    if (match.player1Id !== meId && match.player2Id !== meId) return false
    const opponentId = match.player1Id === meId ? match.player2Id : match.player1Id
    if (opponentId === null) return false
    const opponent = yield* db.query((d) =>
      d.query.user.findFirst({ columns: { isGuest: true }, where: eq(user.id, opponentId) }),
    )
    return opponent?.isGuest ?? false
  })

  const matchView = Effect.fn('EventsService.matchView')(function* (matchId: string, bestOf: BestOf) {
    const m = yield* db.query((d) => d.query.matches.findFirst({ where: eq(matches.id, matchId) }))
    if (!m) return yield* new NotFound({ entity: 'Match', id: matchId })
    const seated = m.player2Id === null ? [m.player1Id] : [m.player1Id, m.player2Id]
    const [refs, entries, round] = yield* Effect.all(
      [
        playerRefs(seated),
        db.query((d) =>
          d
            .select({ userId: eventPlayers.userId, droppedAtRound: eventPlayers.droppedAtRound })
            .from(eventPlayers)
            .where(and(eq(eventPlayers.eventId, m.eventId), inArray(eventPlayers.userId, seated))),
        ),
        db.query((d) => d.query.rounds.findFirst({ columns: { elimination: true }, where: eq(rounds.id, m.roundId) })),
      ],
      { concurrency: 'unbounded' },
    )
    return toMatchView(m, refs, {
      droppedAtRound: new Map(entries.map((e) => [e.userId, e.droppedAtRound])),
      elimination: round?.elimination ?? false,
      bestOf,
    })
  })

  const reportResult = Effect.fn('EventsService.reportResult')(function* (
    matchId: string,
    player1Games: number,
    player2Games: number,
  ) {
    const { me, match, event, isHost } = yield* loadMatchForActor(matchId)
    const score = [player1Games, player2Games] as const
    const round = yield* db.query((d) =>
      d.query.rounds.findFirst({ columns: { elimination: true }, where: eq(rounds.id, match.roundId) }),
    )
    const invalid = invalidScoreReason(scoreRules(event.bestOf, { allowEqualGames: !round?.elimination }), score)
    if (invalid) return yield* new InvalidState({ reason: invalid })
    const againstGuest = yield* reportsAgainstGuest(match, me.id)
    const outcome = matchOutcome(score)
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
          confirmedAt: isHost || agreesWithPending || againstGuest ? now : null,
        })
        .where(eq(matches.id, matchId)),
    )
    return yield* matchView(matchId, event.bestOf)
  })

  const confirmResult = Effect.fn('EventsService.confirmResult')(function* (matchId: string) {
    const { me, match, event, isHost } = yield* loadMatchForActor(matchId)
    if (match.outcome === null) return yield* new InvalidState({ reason: 'Nobody has reported this match yet' })
    if (match.confirmedAt !== null) return yield* matchView(matchId, event.bestOf)
    if (!isHost && match.reportedById === me.id) {
      return yield* new InvalidState({ reason: 'Your opponent needs to confirm the result you reported' })
    }
    const now = new Date(yield* Clock.currentTimeMillis)
    yield* db.query((d) => d.update(matches).set({ confirmedAt: now }).where(eq(matches.id, matchId)))
    return yield* matchView(matchId, event.bestOf)
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
    addGuest,
    removeGuest,
    guests,
    claimPreview,
    claimGuest,
    setDeckRequired,
    setPrivate,
    setBestOf,
    setPairingSystem,
    setTopCut,
    leave,
    startNextRound,
    cutToTop,
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
