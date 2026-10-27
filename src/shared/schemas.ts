import { z } from 'zod'
import { BEST_OF_VALUES, DEFAULT_BEST_OF, MAX_GAMES } from '#/domain/best-of.ts'
import { EVENT_FORMATS } from '#/server/db/schema.ts'

/**
 * Zod schemas for everything a user types. They validate forms on the client
 * and the same objects validate server-function input, so both sides agree.
 * Domain models and persisted data use Effect Schema instead (see src/domain).
 */

const eventFormat = z.enum(EVENT_FORMATS)

const bestOfSchema =z.union(BEST_OF_VALUES.map((n) => z.literal(n)))

export const createEventInput = z.object({
  name: z.string().trim().min(3, 'Give the event a name of at least 3 characters').max(80),
  storeName: z.string().trim().min(2, 'Which store is hosting?').max(80),
  description: z.string().trim().max(500).optional(),
  format: eventFormat,
  plannedRounds: z.coerce.number().int().min(0).max(12),
  roundMinutes: z.coerce.number().int().min(10, 'Rounds need at least 10 minutes').max(120),
  startsAt: z.coerce.date(),
  deckRequired: z.boolean().default(false),
  bestOf: bestOfSchema.default(DEFAULT_BEST_OF),
})
export type CreateEventInput = z.infer<typeof createEventInput>

export const eventIdInput = z.object({ eventId: z.string().min(1) })
export const joinCodeInput = z.object({ code: z.string().trim().min(4).max(12) })

export const joinEventInput = z.object({
  eventId: z.string().min(1),
  deckId: z.string().min(1).nullable().optional(),
})

export const guestNameInput = z.string().trim().min(2, 'Give the player a name of at least 2 characters').max(40)

/** Host adds a player without an account: a new guest by name, or one from their guest list. */
export const addGuestInput = z.object({
  eventId: z.string().min(1),
  guest: z.union([z.object({ name: guestNameInput }), z.object({ guestId: z.string().min(1) })]),
})

export const removeGuestInput = z.object({ eventId: z.string().min(1), guestId: z.string().min(1) })
export const claimCodeInput = z.object({ code: z.string().trim().min(16).max(64) })

export const deckRequiredInput = z.object({
  eventId: z.string().min(1),
  deckRequired: z.boolean(),
})

export const bestOfInput = z.object({
  eventId: z.string().min(1),
  bestOf: bestOfSchema,
})

/** Shape only: the event's best-of decides which scores are possible (`EventsService.reportResult`). */
export const reportResultInput = z.object({
  matchId: z.string().min(1),
  player1Games: z.number().int().min(0).max(MAX_GAMES),
  player2Games: z.number().int().min(0).max(MAX_GAMES),
})

export const matchIdInput = z.object({ matchId: z.string().min(1) })

export const clockInput = z.object({
  eventId: z.string().min(1),
  action: z.enum(['pause', 'resume', 'adjust']),
  deltaMinutes: z.number().int().min(-60).max(60).optional(),
})

export const listEventsInput = z.object({
  search: z.string().trim().max(80).optional(),
  scope: z.enum(['upcoming', 'live', 'finished', 'mine']).default('upcoming'),
})

export const deckInput = z.object({
  name: z.string().trim().min(2, 'Name your deck').max(60),
  format: eventFormat,
  archetype: z.string().trim().max(60).optional(),
  list: z.string().trim().min(1, 'Paste your deck list').max(10_000),
  /** `cardArtKey` of the cover printing ("TWM 130"); null for the featured Pokémon. */
  coverCard: z.string().trim().max(24).nullable().optional(),
  isPublic: z.boolean().default(true),
})
export type DeckInput = z.infer<typeof deckInput>

export const updateDeckInput = deckInput.extend({ deckId: z.string().min(1) })
export const deckIdInput = z.object({ deckId: z.string().min(1) })

export const usernameInput = z.object({ username: z.string().trim().min(1).max(40) })

export const profileInput = z.object({
  name: z.string().trim().min(2).max(60),
  username: z
    .string()
    .trim()
    .min(3, 'At least 3 characters')
    .max(24)
    .regex(/^[a-z0-9_]+$/i, 'Letters, numbers and underscores only'),
  playerId: z
    .string()
    .trim()
    .regex(/^\d{4,10}$/, 'Play! Pokémon IDs are numbers only')
    .optional()
    .or(z.literal('')),
  bio: z.string().trim().max(240).optional(),
  image: z.url().nullable().optional(),
})
export type ProfileInput = z.infer<typeof profileInput>
