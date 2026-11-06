import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { TestClock } from 'effect/testing'
import { DEFAULT_BEST_OF } from '#/domain/best-of.ts'
import { defaultAvatar } from '#/domain/avatar-parts.ts'
import type { CreateEventInput, PlayerStyleInput } from '#/shared/schemas.ts'
import { CardCatalog, type CatalogCard } from '../catalog/card-catalog.ts'
import type { SessionUser } from '../current-user.ts'
import { DecksService } from '../decks/service.ts'
import { EventsService } from '../events/service.ts'
import type { MatchView } from '../events/views.ts'
import { ProfilesService } from '../profiles/service.ts'
import { asUser, insertUser, withDb } from '../testing.ts'
import { AchievementsService } from './achievements.ts'
import { backfillPlayerIdentity } from './backfill.ts'
import { PlayerStyleService } from './player-style.ts'

const pikachu: CatalogCard = {
  id: 'sv03.5-025',
  name: 'Pikachu',
  setId: 'sv03.5',
  setName: '151',
  localId: '025',
  small: 'https://assets.test/sv03.5/025/low.webp',
  large: 'https://assets.test/sv03.5/025/high.webp',
}

const layerWith = (cards: ReadonlyArray<CatalogCard> | 'unreachable' = [pikachu]) =>
  withDb(
    Layer.mergeAll(
      EventsService.layer,
      AchievementsService.layer,
      ProfilesService.layer,
      PlayerStyleService.layer,
      DecksService.layer,
    ).pipe(Layer.provide(CardCatalog.layerTest({}, cards))),
  )
const TestLayer = layerWith()

const newEvent: CreateEventInput = {
  name: 'League Night',
  storeName: 'Nimbasa Games',
  format: 'standard',
  plannedRounds: 0,
  roundMinutes: 50,
  startsAt: new Date(),
  deckRequired: false,
  bestOf: DEFAULT_BEST_OF,
  pairingSystem: 'single_elimination',
  topCut: false,
}

const HOUR = 3_600_000

/** Users made at hour 1, so everything played after counts as new for them. */
const people = Effect.fn('people')(function* (...names: Array<string>) {
  yield* TestClock.setTime(HOUR)
  const users: Array<SessionUser> = []
  for (const name of names) users.push(yield* insertUser(name))
  return users
})

/** The host reports every open match of the current round, the player `prefer` names winning when seated. */
const playRound = Effect.fn('playRound')(function* (host: SessionUser, eventId: string, prefer: ReadonlyArray<string>) {
  const events = yield* EventsService
  const detail = yield* events.detail(eventId)
  const open = detail.matches.filter(
    (m) => m.roundNumber === detail.event.currentRound && m.player2 && m.status !== 'confirmed',
  )
  for (const m of open) {
    const p1Wins = !prefer.includes(m.player2!.id) || prefer.includes(m.player1.id)
    yield* events.reportResult(m.id, p1Wins ? 2 : 0, p1Wins ? 0 : 2).pipe(asUser(host))
  }
})

/** A single-elimination event played to its end, the players in `prefer` winning where they can. */
const playEvent = Effect.fn('playEvent')(function* (
  host: SessionUser,
  entrants: ReadonlyArray<SessionUser>,
  prefer: ReadonlyArray<string>,
  input: Partial<CreateEventInput> = {},
) {
  const events = yield* EventsService
  const { id } = yield* events.create({ ...newEvent, ...input }).pipe(asUser(host))
  for (const p of entrants) yield* events.join(id).pipe(asUser(p))
  yield* events.startNextRound(id).pipe(asUser(host))
  for (;;) {
    yield* playRound(host, id, prefer)
    const { progress } = yield* events.detail(id)
    if (progress.isLastRound) break
    yield* events.startNextRound(id).pipe(asUser(host))
  }
  yield* TestClock.adjust(HOUR)
  yield* events.finishEvent(id).pipe(asUser(host))
  return id
})

const styleInput = (userId: string, overrides: Partial<PlayerStyleInput> = {}): PlayerStyleInput => ({
  avatar: defaultAvatar(userId),
  sleeveColour: 'teal',
  banner: 'card-zones',
  bannerColour: null,
  title: null,
  showcase: [],
  featuredDeckId: null,
  partner: null,
  ...overrides,
})

const tiers = (userId: string) =>
  AchievementsService.use((a) => a.earned(userId)).pipe(
    Effect.map((e) => e.map((t) => `${t.achievement}:${t.tier}`).sort()),
  )

describe('default styles', () => {
  it.effect('every new user and new guest gets a stored default look', () =>
    Effect.gen(function* () {
      const [host] = yield* people('Elesa')
      const events = yield* EventsService
      const { id } = yield* events.create(newEvent).pipe(asUser(host!))
      const { guestId } = yield* events.addGuest(id, { name: 'Walk-in' }).pipe(asUser(host!))

      expect(yield* backfillPlayerIdentity()).toEqual({ users: 0 })
      const style = yield* PlayerStyleService.use((s) => s.get(guestId))
      expect(style.avatar).toEqual(defaultAvatar(guestId))
      expect((yield* events.detail(id)).players[0]!.avatar).toEqual(defaultAvatar(guestId))
    }).pipe(Effect.provide(TestLayer)),
  )
})

describe('achievements from events', () => {
  it.effect('the winner of a 4-player event holds Champion 1 from its finish date and may wear the Champion cap', () =>
    Effect.gen(function* () {
      const [host, ash, gary, misty, brock] = yield* people('Elesa', 'Ash', 'Gary', 'Misty', 'Brock')
      yield* playEvent(host!, [ash!, gary!, misty!, brock!], [ash!.id])

      expect(yield* tiers(ash!.id)).toEqual(['champion:1', 'match-winner:1', 'regular:1'])
      expect(yield* tiers(host!.id)).toEqual(['host:1'])
      const champion = (yield* AchievementsService.use((a) => a.earned(ash!.id))).find(
        (t) => t.achievement === 'champion',
      )
      expect(champion!.earnedAt).toBe(2 * HOUR)

      const unseen = yield* AchievementsService.use((a) => a.unseen()).pipe(asUser(ash!))
      expect(unseen.busy).toBe(false)
      expect(unseen.welcome).toBe(false)
      expect(unseen.unlocks[0]).toMatchObject({
        achievement: 'champion',
        tier: 1,
        title: 'champion',
        trophies: ['champion-cap', 'champion-slab'],
      })

      const saved = yield* PlayerStyleService.use((s) =>
        s.save(
          styleInput(ash!.id, {
            avatar: { ...defaultAvatar(ash!.id), hat: 'champion-cap' },
            title: 'champion',
            showcase: ['champion'],
          }),
        ),
      ).pipe(asUser(ash!))
      expect(saved).toMatchObject({ title: 'champion', showcase: ['champion'] })
      expect(saved.avatar.hat).toBe('champion-cap')
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect('a 3-player event, or one with fewer than 2 accounts, earns nothing', () =>
    Effect.gen(function* () {
      const [host, ash, gary, misty] = yield* people('Elesa', 'Ash', 'Gary', 'Misty')
      yield* playEvent(host!, [ash!, gary!, misty!], [ash!.id])
      expect(yield* tiers(ash!.id)).toEqual([])
      expect(yield* tiers(host!.id)).toEqual([])

      const events = yield* EventsService
      const { id } = yield* events.create(newEvent).pipe(asUser(host!))
      yield* events.join(id).pipe(asUser(ash!))
      for (const name of ['G1', 'G2', 'G3']) yield* events.addGuest(id, { name }).pipe(asUser(host!))
      yield* events.startNextRound(id).pipe(asUser(host!))
      yield* playRound(host!, id, [ash!.id])
      yield* events.startNextRound(id).pipe(asUser(host!))
      yield* playRound(host!, id, [ash!.id])
      yield* events.finishEvent(id).pipe(asUser(host!))
      expect(yield* tiers(ash!.id)).toEqual([])
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect('a correction that takes Champion away quietly takes back the cap, the title and the badge', () =>
    Effect.gen(function* () {
      const [host, ash, gary, misty, brock] = yield* people('Elesa', 'Ash', 'Gary', 'Misty', 'Brock')
      const eventId = yield* playEvent(host!, [ash!, gary!, misty!, brock!], [ash!.id])
      yield* PlayerStyleService.use((s) =>
        s.save(
          styleInput(ash!.id, {
            avatar: { ...defaultAvatar(ash!.id), hat: 'champion-cap' },
            banner: 'champion-slab',
            title: 'champion',
            showcase: ['champion', 'regular'],
          }),
        ),
      ).pipe(asUser(ash!))
      yield* AchievementsService.use((a) => a.markSeen()).pipe(asUser(ash!))

      const events = yield* EventsService
      const final = (yield* events.detail(eventId)).matches.find((m) => m.roundNumber === 2)!
      const ashIsP1 = final.player1.id === ash!.id
      yield* events.reportResult(final.id, ashIsP1 ? 0 : 2, ashIsP1 ? 2 : 0).pipe(asUser(host!))

      expect(yield* tiers(ash!.id)).not.toContain('champion:1')
      const style = yield* PlayerStyleService.use((s) => s.get(ash!.id))
      expect(style.avatar.hat).toBe(defaultAvatar(ash!.id).hat)
      expect(style.banner).toBe('card-zones')
      expect(style.title).toBeNull()
      expect(style.showcase).toEqual(['regular'])
      expect((yield* AchievementsService.use((a) => a.unseen()).pipe(asUser(ash!))).unlocks).toEqual([])
      const opponent = final.player1.id === ash!.id ? final.player2! : final.player1
      expect(yield* tiers(opponent.id)).toContain('champion:1')
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect('byes never count as match wins', () =>
    Effect.gen(function* () {
      const [host, ...players] = yield* people('Elesa', 'A', 'B', 'C', 'D', 'E')
      const eventId = yield* playEvent(host!, players, [])
      const bye = (yield* EventsService.use((e) => e.detail(eventId))).matches.find(
        (m: MatchView) => m.player2 === null,
      )!
      const view = yield* AchievementsService.use((a) => a.forPlayer(bye.player1.id))
      const winner = view.achievements.find((a) => a.id === 'match-winner')!
      const played = (yield* EventsService.use((e) => e.detail(eventId))).matches.filter(
        (m) =>
          m.player2 &&
          ((m.player1.id === bye.player1.id && m.outcome === 'p1') ||
            (m.player2.id === bye.player1.id && m.outcome === 'p2')),
      )
      expect(winner.progress).toBe(played.length)
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect('claiming a guest brings their history to the account and drops the guest style', () =>
    Effect.gen(function* () {
      const [host, gary, misty, brock, ash] = yield* people('Elesa', 'Gary', 'Misty', 'Brock', 'Ash')
      const events = yield* EventsService
      const { id } = yield* events.create(newEvent).pipe(asUser(host!))
      for (const p of [gary!, misty!, brock!]) yield* events.join(id).pipe(asUser(p))
      const { guestId } = yield* events.addGuest(id, { name: 'Ash' }).pipe(asUser(host!))
      yield* events.startNextRound(id).pipe(asUser(host!))
      yield* playRound(host!, id, [guestId])
      yield* events.startNextRound(id).pipe(asUser(host!))
      yield* playRound(host!, id, [guestId])
      yield* events.finishEvent(id).pipe(asUser(host!))

      const before = yield* PlayerStyleService.use((s) => s.get(ash!.id))
      const code = (yield* events.guests().pipe(asUser(host!)))[0]!.claimCode
      yield* events.claimGuest(code).pipe(asUser(ash!))
      expect(yield* tiers(ash!.id)).toContain('champion:1')
      expect(yield* PlayerStyleService.use((s) => s.get(ash!.id))).toEqual(before)
      expect(yield* backfillPlayerIdentity()).toEqual({ users: 0 })
    }).pipe(Effect.provide(TestLayer)),
  )
})

describe('PlayerStyleService.save', () => {
  it.effect('refuses unearned items, titles and badges, and more than 3 badges', () =>
    Effect.gen(function* () {
      const [ash] = yield* people('Ash')
      const save = (overrides: Partial<PlayerStyleInput>) =>
        Effect.flip(PlayerStyleService.use((s) => s.save(styleInput(ash!.id, overrides))).pipe(asUser(ash!)))
      expect((yield* save({ avatar: { ...defaultAvatar(ash!.id), top: 'topcut-jacket' } })).message).toMatch(
        /Top-cut jacket/,
      )
      expect((yield* save({ banner: 'champion-slab' })).message).toMatch(/Champion slab/)
      expect((yield* save({ title: 'dynasty' })).message).toMatch(/Dynasty/)
      expect((yield* save({ showcase: ['regular'] })).message).toMatch(/Regular badge/)
      expect((yield* save({ showcase: ['regular', 'host', 'brewer', 'rival'] })).message).toMatch(/up to 3/)
      expect((yield* PlayerStyleService.use((s) => s.save(styleInput(ash!.id))).pipe(asUser(ash!))).sleeveColour).toBe(
        'teal',
      )
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect('features only a public deck of your own, and stops featuring it when it goes private or away', () =>
    Effect.gen(function* () {
      const [ash, gary] = yield* people('Ash', 'Gary')
      const decks = yield* DecksService
      const deck = { name: 'Dragapult ex', format: 'standard' as const, list: '4 Dreepy TWM 128', isPublic: true }
      const { id } = yield* decks.create(deck).pipe(asUser(ash!))
      const { id: hidden } = yield* decks.create({ ...deck, isPublic: false }).pipe(asUser(ash!))
      const { id: garys } = yield* decks.create(deck).pipe(asUser(gary!))
      const feature = (deckId: string) =>
        PlayerStyleService.use((s) => s.save(styleInput(ash!.id, { featuredDeckId: deckId }))).pipe(asUser(ash!))

      expect((yield* Effect.flip(feature(hidden))).message).toMatch(/public/)
      expect((yield* Effect.flip(feature(garys))).message).toMatch(/your own/)
      expect((yield* feature(id)).featuredDeckId).toBe(id)
      expect((yield* ProfilesService.use((p) => p.byUsername(ash!.username!))).identity.featuredDeck).toMatchObject({
        id,
        wins: 0,
      })

      yield* decks.update(id, { ...deck, isPublic: false }).pipe(asUser(ash!))
      expect((yield* PlayerStyleService.use((s) => s.get(ash!.id))).featuredDeckId).toBeNull()
      yield* decks.update(id, deck).pipe(asUser(ash!))
      expect((yield* PlayerStyleService.use((s) => s.get(ash!.id))).featuredDeckId).toBeNull()

      yield* feature(id)
      yield* decks.remove(id).pipe(asUser(ash!))
      expect((yield* PlayerStyleService.use((s) => s.get(ash!.id))).featuredDeckId).toBeNull()
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect('resolves the partner Pokémon through the catalog', () =>
    Effect.gen(function* () {
      const [ash] = yield* people('Ash')
      const saved = yield* PlayerStyleService.use((s) =>
        s.save(styleInput(ash!.id, { partner: { cardId: pikachu.id, name: 'Pikachu' } })),
      ).pipe(asUser(ash!))
      expect(saved.partner).toEqual({ cardId: pikachu.id, name: 'Pikachu', setName: '151', imageUrl: pikachu.large })
      const missing = yield* Effect.flip(
        PlayerStyleService.use((s) =>
          s.save(styleInput(ash!.id, { partner: { cardId: 'nope', name: 'Pikachu' } })),
        ).pipe(asUser(ash!)),
      )
      expect(missing.message).toMatch(/isn’t in the catalog/)
      const found = yield* PlayerStyleService.use((s) => s.searchPartner('pika', 1)).pipe(asUser(ash!))
      expect(found.cards.map((c) => c.id)).toEqual([pikachu.id])
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect('says so when the catalog is unreachable instead of finding nothing', () =>
    Effect.gen(function* () {
      const [ash] = yield* people('Ash')
      const error = yield* Effect.flip(PlayerStyleService.use((s) => s.searchPartner('pikachu', 1)).pipe(asUser(ash!)))
      expect(error._tag).toBe('CatalogUnavailable')
    }).pipe(Effect.provide(layerWith('unreachable'))),
  )
})

describe('unseen unlocks', () => {
  it.effect('markSeen empties unseen; nothing else does', () =>
    Effect.gen(function* () {
      const [host, ash, gary, misty, brock] = yield* people('Elesa', 'Ash', 'Gary', 'Misty', 'Brock')
      yield* playEvent(host!, [ash!, gary!, misty!, brock!], [ash!.id])
      const unseen = () => AchievementsService.use((a) => a.unseen()).pipe(asUser(ash!))
      expect((yield* unseen()).unlocks.length).toBeGreaterThan(0)
      expect((yield* unseen()).unlocks.length).toBeGreaterThan(0)
      yield* TestClock.adjust(HOUR)
      yield* AchievementsService.use((a) => a.markSeen()).pipe(asUser(ash!))
      expect((yield* unseen()).unlocks).toEqual([])
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect(
    'a player is busy while entered in a running event or hosting one, and not once it finishes or they drop',
    () =>
      Effect.gen(function* () {
        const [host, ash, gary, misty, brock] = yield* people('Elesa', 'Ash', 'Gary', 'Misty', 'Brock')
        const events = yield* EventsService
        const busy = (who: SessionUser) =>
          AchievementsService.use((a) => a.unseen()).pipe(
            asUser(who),
            Effect.map((u) => u.busy),
          )
        const { id } = yield* events
          .create({ ...newEvent, pairingSystem: 'swiss', plannedRounds: 2 })
          .pipe(asUser(host!))
        for (const p of [ash!, gary!, misty!, brock!]) yield* events.join(id).pipe(asUser(p))
        expect(yield* busy(ash!)).toBe(false)
        yield* events.startNextRound(id).pipe(asUser(host!))
        expect(yield* busy(ash!)).toBe(true)
        expect(yield* busy(host!)).toBe(true)
        yield* events.leave(id).pipe(asUser(gary!))
        expect(yield* busy(gary!)).toBe(false)
        yield* playRound(host!, id, [])
        yield* events.finishEvent(id).pipe(asUser(host!))
        expect(yield* busy(ash!)).toBe(false)
        expect(yield* busy(host!)).toBe(false)
      }).pipe(Effect.provide(TestLayer)),
  )

  it.effect('the launch backfill stores defaults and tiers, and the welcome plays until the tab is opened', () =>
    Effect.gen(function* () {
      const [host, ash, gary, misty, brock] = yield* people('Elesa', 'Ash', 'Gary', 'Misty', 'Brock')
      yield* playEvent(host!, [ash!, gary!, misty!, brock!], [ash!.id])
      // As before launch: no style rows and no stored tiers.
      const { Db } = yield* Effect.promise(() => import('../db/client.ts'))
      const schema = yield* Effect.promise(() => import('../db/schema.ts'))
      const db = yield* Db
      yield* db.query((d) => d.batch([d.delete(schema.playerStyle), d.delete(schema.earnedTiers)]))

      expect(yield* backfillPlayerIdentity()).toEqual({ users: 5 })
      expect((yield* PlayerStyleService.use((s) => s.get(ash!.id))).avatar).toEqual(defaultAvatar(ash!.id))
      expect(yield* tiers(ash!.id)).toContain('champion:1')
      const unseen = yield* AchievementsService.use((a) => a.unseen()).pipe(asUser(ash!))
      expect(unseen.welcome).toBe(true)
      expect(unseen.unlocks.length).toBe(3)
      expect(unseen.unlocks.every((u) => u.backfilled)).toBe(true)

      // Ash hosts an event after launch: that tier is a real new unlock, not part of the welcome.
      yield* TestClock.adjust(HOUR)
      yield* playEvent(ash!, [host!, gary!, misty!, brock!], [])
      const later = yield* AchievementsService.use((a) => a.unseen()).pipe(asUser(ash!))
      expect(later.unlocks.find((u) => u.achievement === 'host')).toMatchObject({ tier: 1, backfilled: false })
      expect(later.unlocks.filter((u) => u.backfilled)).toHaveLength(3)

      yield* AchievementsService.use((a) => a.markSeen()).pipe(asUser(ash!))
      expect((yield* AchievementsService.use((a) => a.unseen()).pipe(asUser(ash!))).welcome).toBe(false)
      expect(yield* backfillPlayerIdentity()).toEqual({ users: 0 })
    }).pipe(Effect.provide(TestLayer)),
  )
})
