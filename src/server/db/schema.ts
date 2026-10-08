import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`)
    .$onUpdate(() => new Date()),
}

/* ------------------------------------------------------------------ */
/* better-auth                                                         */
/* ------------------------------------------------------------------ */

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  username: text('username').unique(),
  displayUsername: text('display_username'),
  playerId: text('player_id'),
  bio: text('bio'),
  ...timestamps,
})

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (t) => [index('session_user_idx').on(t.userId)],
)

export const account = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
    scope: text('scope'),
    password: text('password'),
    ...timestamps,
  },
  (t) => [index('account_user_idx').on(t.userId)],
)

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  ...timestamps,
})

/* ------------------------------------------------------------------ */
/* League domain                                                       */
/* ------------------------------------------------------------------ */

export const EVENT_FORMATS = ['standard', 'expanded', 'glc', 'unlimited'] as const
export const EVENT_STATUSES = ['registration', 'running', 'finished'] as const
export const ROUND_STATUSES = ['active', 'finished'] as const
export const MATCH_OUTCOMES = ['p1', 'p2', 'draw', 'bye'] as const

export const events = sqliteTable(
  'events',
  {
    id: text('id').primaryKey(),
    hostId: text('host_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    storeName: text('store_name').notNull(),
    format: text('format', { enum: EVENT_FORMATS }).notNull().default('standard'),
    status: text('status', { enum: EVENT_STATUSES }).notNull().default('registration'),
    joinCode: text('join_code').notNull().unique(),
    /** 0 means "pick the recommended Swiss round count when the event starts". */
    plannedRounds: integer('planned_rounds').notNull().default(0),
    roundMinutes: integer('round_minutes').notNull().default(50),
    currentRound: integer('current_round').notNull().default(0),
    startsAt: integer('starts_at', { mode: 'timestamp_ms' }).notNull(),
    finishedAt: integer('finished_at', { mode: 'timestamp_ms' }),
    ...timestamps,
  },
  (t) => [index('events_host_idx').on(t.hostId), index('events_status_idx').on(t.status)],
)

export const eventPlayers = sqliteTable(
  'event_players',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    deckId: text('deck_id').references(() => decks.id, { onDelete: 'set null' }),
    droppedAtRound: integer('dropped_at_round'),
    finalRank: integer('final_rank'),
    joinedAt: integer('joined_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    uniqueIndex('event_players_event_user_uq').on(t.eventId, t.userId),
    index('event_players_user_idx').on(t.userId),
  ],
)

export const rounds = sqliteTable(
  'rounds',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    status: text('status', { enum: ROUND_STATUSES }).notNull().default('active'),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
    /** When the clock hits zero. Null while the clock is paused. */
    endsAt: integer('ends_at', { mode: 'timestamp_ms' }),
    /** Remaining milliseconds captured when the host pauses the clock. */
    pausedRemainingMs: integer('paused_remaining_ms'),
    finishedAt: integer('finished_at', { mode: 'timestamp_ms' }),
  },
  (t) => [uniqueIndex('rounds_event_number_uq').on(t.eventId, t.number)],
)

export const matches = sqliteTable(
  'matches',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    roundId: text('round_id')
      .notNull()
      .references(() => rounds.id, { onDelete: 'cascade' }),
    roundNumber: integer('round_number').notNull(),
    table: integer('table_number').notNull(),
    player1Id: text('player1_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** Null when player 1 received a bye. */
    player2Id: text('player2_id').references(() => user.id, { onDelete: 'cascade' }),
    player1Games: integer('player1_games').notNull().default(0),
    player2Games: integer('player2_games').notNull().default(0),
    outcome: text('outcome', { enum: MATCH_OUTCOMES }),
    reportedById: text('reported_by_id').references(() => user.id, { onDelete: 'set null' }),
    reportedAt: integer('reported_at', { mode: 'timestamp_ms' }),
    confirmedAt: integer('confirmed_at', { mode: 'timestamp_ms' }),
  },
  (t) => [
    index('matches_event_idx').on(t.eventId),
    index('matches_round_idx').on(t.roundId),
    index('matches_p1_idx').on(t.player1Id),
    index('matches_p2_idx').on(t.player2Id),
  ],
)

export const decks = sqliteTable(
  'decks',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    format: text('format', { enum: EVENT_FORMATS }).notNull().default('standard'),
    /** Free text such as "Charizard ex / Pidgeot ex". */
    archetype: text('archetype'),
    /** Raw PTCG Live export. Parsed on read so the source of truth stays editable. */
    list: text('list').notNull(),
    cardCount: integer('card_count').notNull().default(0),
    coverImageUrl: text('cover_image_url'),
    /** Card art by `cardArtKey` ("TWM 130" → image URL), resolved through the card catalog when the deck is saved. */
    cardImages: text('card_images', { mode: 'json' }).$type<Record<string, string>>().notNull().default({}),
    isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(true),
    ...timestamps,
  },
  (t) => [index('decks_user_idx').on(t.userId)],
)

/* ------------------------------------------------------------------ */
/* Relations                                                           */
/* ------------------------------------------------------------------ */

export const userRelations = relations(user, ({ many }) => ({
  decks: many(decks),
  hostedEvents: many(events),
  entries: many(eventPlayers),
}))

export const eventRelations = relations(events, ({ one, many }) => ({
  host: one(user, { fields: [events.hostId], references: [user.id] }),
  players: many(eventPlayers),
  rounds: many(rounds),
  matches: many(matches),
}))

export const eventPlayerRelations = relations(eventPlayers, ({ one }) => ({
  event: one(events, { fields: [eventPlayers.eventId], references: [events.id] }),
  user: one(user, { fields: [eventPlayers.userId], references: [user.id] }),
  deck: one(decks, { fields: [eventPlayers.deckId], references: [decks.id] }),
}))

export const roundRelations = relations(rounds, ({ one, many }) => ({
  event: one(events, { fields: [rounds.eventId], references: [events.id] }),
  matches: many(matches),
}))

export const matchRelations = relations(matches, ({ one }) => ({
  event: one(events, { fields: [matches.eventId], references: [events.id] }),
  round: one(rounds, { fields: [matches.roundId], references: [rounds.id] }),
}))

export const deckRelations = relations(decks, ({ one }) => ({
  owner: one(user, { fields: [decks.userId], references: [user.id] }),
}))

export type UserRow = typeof user.$inferSelect
export type EventRow = typeof events.$inferSelect
export type EventPlayerRow = typeof eventPlayers.$inferSelect
export type RoundRow = typeof rounds.$inferSelect
export type MatchRow = typeof matches.$inferSelect
export type DeckRow = typeof decks.$inferSelect
export type EventFormat = (typeof EVENT_FORMATS)[number]
export type EventStatus = (typeof EVENT_STATUSES)[number]
export type MatchOutcome = (typeof MATCH_OUTCOMES)[number]
