/**
 * The avatar's parts list, its curated palette, the playmat banners and the trophy items, plus the default avatar
 * worked out from a user id. Pure, no IO.
 *
 * Every part has a stable string id. Ids are names, never list positions or hex values, so a stored avatar survives
 * parts being added or reordered. Lists are append-only: a part that is retired disappears from its list, and a stored
 * id that no longer exists reads as the player's default part (`resolveAvatar`).
 */
import type { AchievementId } from './achievements.ts'

export interface AvatarPart {
  readonly id: string
  readonly name: string
  /** Colours only: the literal fill. */
  readonly hex?: string
  /** Set on trophy items: only players who reached its tier may wear it. */
  readonly trophy?: TrophyItemId
}

export const AVATAR_SLOTS = [
  'skin',
  'hair',
  'hairColour',
  'facialHair',
  'face',
  'top',
  'topColour',
  'hat',
  'hatColour',
  'hatPanel',
  'accessory',
] as const
export type AvatarSlot = (typeof AVATAR_SLOTS)[number]

/** A player's look: each slot names a part id. */
export type Avatar = { readonly [S in AvatarSlot]: string }
export type AvatarParts = { readonly [S in AvatarSlot]: ReadonlyArray<AvatarPart> }

/* ------------------------------------------------------------------ */
/* Palette: content, not UI (DESIGN.md)                                */
/* ------------------------------------------------------------------ */

export const GOLD = '#E2B33C'
/** Facial features and line work inside the avatar. */
export const AVATAR_INK = '#14151A'
/** The round frame behind the bust. */
export const AVATAR_FIELD = '#24252C'

export const SKIN_TONES: ReadonlyArray<AvatarPart> = [
  { id: 'skin-1', name: 'Porcelain', hex: '#F7DCC8' },
  { id: 'skin-2', name: 'Ivory', hex: '#EBBF9C' },
  { id: 'skin-3', name: 'Sand', hex: '#D49C70' },
  { id: 'skin-4', name: 'Honey', hex: '#AE7449' },
  { id: 'skin-5', name: 'Bronze', hex: '#7D4B2C' },
  { id: 'skin-6', name: 'Umber', hex: '#64391F' },
  { id: 'skin-7', name: 'Espresso', hex: '#4F2F1D' },
]

export const HAIR_COLOURS: ReadonlyArray<AvatarPart> = [
  { id: 'black', name: 'Black', hex: '#17181B' },
  { id: 'brown', name: 'Brown', hex: '#4A2E1E' },
  { id: 'chestnut', name: 'Chestnut', hex: '#8A5A2B' },
  { id: 'blonde', name: 'Blonde', hex: '#D9A441' },
  { id: 'silver', name: 'Silver', hex: '#CFC8BE' },
  { id: 'red', name: 'Red', hex: '#B5452F' },
  { id: 'blue', name: 'Blue', hex: '#3E5DA8' },
  { id: 'pink', name: 'Pink', hex: '#D97BA6' },
]

/** Shared by tops, hats, the sleeve colour and the playmat banner. */
export const CLOTHING_COLOURS: ReadonlyArray<AvatarPart> = [
  { id: 'paper', name: 'Paper', hex: '#EDE8E0' },
  { id: 'ink', name: 'Ink', hex: '#2B2E36' },
  { id: 'blue', name: 'Blue', hex: '#3F6FB6' },
  { id: 'red', name: 'Red', hex: '#C23B3B' },
  { id: 'green', name: 'Green', hex: '#2F8F5B' },
  { id: 'gold', name: 'Gold', hex: GOLD },
  { id: 'purple', name: 'Purple', hex: '#7A4FB0' },
  { id: 'teal', name: 'Teal', hex: '#2C8C99' },
]

/* ------------------------------------------------------------------ */
/* Trophy items                                                        */
/* ------------------------------------------------------------------ */

export const TROPHY_ITEM_IDS = ['champion-cap', 'champion-slab', 'topcut-jacket', 'top8-visor', 'league-pin'] as const
export type TrophyItemId = (typeof TROPHY_ITEM_IDS)[number]

export interface TrophyItem {
  readonly id: TrophyItemId
  readonly name: string
  /** Where it is worn: an avatar slot, or the playmat banner. */
  readonly slot: 'hat' | 'top' | 'accessory' | 'banner'
  /** The tier (1-based) of the achievement that earns it. */
  readonly earnedAt: { readonly achievement: AchievementId; readonly tier: number }
}

export const TROPHY_ITEMS: ReadonlyArray<TrophyItem> = [
  { id: 'champion-cap', name: 'Champion cap', slot: 'hat', earnedAt: { achievement: 'champion', tier: 1 } },
  { id: 'champion-slab', name: 'Champion slab', slot: 'banner', earnedAt: { achievement: 'champion', tier: 1 } },
  { id: 'topcut-jacket', name: 'Top-cut jacket', slot: 'top', earnedAt: { achievement: 'top-cut', tier: 1 } },
  { id: 'top8-visor', name: 'Top 8 visor', slot: 'hat', earnedAt: { achievement: 'top-cut', tier: 2 } },
  { id: 'league-pin', name: 'League pin', slot: 'accessory', earnedAt: { achievement: 'regular', tier: 3 } },
]

export const trophyItem = (id: TrophyItemId): TrophyItem => TROPHY_ITEMS.find((t) => t.id === id)!

/* ------------------------------------------------------------------ */
/* Parts                                                               */
/* ------------------------------------------------------------------ */

export const AVATAR_PARTS: AvatarParts = {
  skin: SKIN_TONES,
  hair: [
    { id: 'bald', name: 'Bald' },
    { id: 'short', name: 'Short' },
    { id: 'spiky', name: 'Spiky' },
    { id: 'long', name: 'Long' },
    { id: 'curly', name: 'Curly' },
    { id: 'ponytail', name: 'Ponytail' },
    { id: 'buzz', name: 'Buzz' },
  ],
  hairColour: HAIR_COLOURS,
  facialHair: [
    { id: 'none', name: 'None' },
    { id: 'stubble', name: 'Stubble' },
    { id: 'moustache', name: 'Moustache' },
    { id: 'beard', name: 'Beard' },
  ],
  face: [
    { id: 'smile', name: 'Smile' },
    { id: 'grin', name: 'Grin' },
    { id: 'focused', name: 'Focused' },
  ],
  top: [
    { id: 'tee', name: 'Tee' },
    { id: 'hoodie', name: 'Hoodie' },
    { id: 'track-jacket', name: 'Track jacket' },
    { id: 'jersey', name: 'Jersey' },
    { id: 'topcut-jacket', name: 'Top-cut jacket', trophy: 'topcut-jacket' },
  ],
  topColour: CLOTHING_COLOURS,
  hat: [
    { id: 'none', name: 'None' },
    { id: 'trainer-cap', name: 'Trainer cap' },
    { id: 'backwards-cap', name: 'Backwards cap' },
    { id: 'beanie', name: 'Beanie' },
    { id: 'visor', name: 'Visor' },
    { id: 'bucket-hat', name: 'Bucket hat' },
    { id: 'headband', name: 'Headband' },
    { id: 'champion-cap', name: 'Champion cap', trophy: 'champion-cap' },
    { id: 'top8-visor', name: 'Top 8 visor', trophy: 'top8-visor' },
  ],
  hatColour: CLOTHING_COLOURS,
  hatPanel: CLOTHING_COLOURS,
  accessory: [
    { id: 'none', name: 'None' },
    { id: 'glasses', name: 'Glasses' },
    { id: 'plaster', name: 'Plaster' },
    { id: 'backpack', name: 'Backpack' },
    { id: 'league-pin', name: 'League pin', trophy: 'league-pin' },
  ],
}

/** Hats that cover the head hide the hair above the brim; visors and headbands let it show. */
const COVERING_HATS: ReadonlySet<string> = new Set([
  'trainer-cap',
  'backwards-cap',
  'beanie',
  'bucket-hat',
  'champion-cap',
])
export const hatCoversHead = (hatId: string): boolean => COVERING_HATS.has(hatId)

export const partOf = (slot: AvatarSlot, id: string, parts: AvatarParts = AVATAR_PARTS): AvatarPart | undefined =>
  parts[slot].find((p) => p.id === id)

/** A clothing colour's fill, or the first colour's for an unknown id. */
export const clothingHex = (id: string | null | undefined): string =>
  (CLOTHING_COLOURS.find((c) => c.id === id) ?? CLOTHING_COLOURS[0]!).hex!

/* ------------------------------------------------------------------ */
/* Playmat banners                                                     */
/* ------------------------------------------------------------------ */

export interface Banner {
  readonly id: string
  readonly name: string
  readonly trophy?: TrophyItemId
  /** A trophy banner is always drawn in this colour, whatever the banner colour. */
  readonly fixedHex?: string
}

export const BANNERS: ReadonlyArray<Banner> = [
  { id: 'card-zones', name: 'Card zones' },
  { id: 'prize-grid', name: 'Prize grid' },
  { id: 'damage-counters', name: 'Damage counters' },
  { id: 'slabs', name: 'Slabs' },
  { id: 'led-board', name: 'LED board' },
  { id: 'champion-slab', name: 'Champion slab', trophy: 'champion-slab', fixedHex: GOLD },
]
export const DEFAULT_BANNER = 'card-zones'

/* ------------------------------------------------------------------ */
/* Default avatar                                                      */
/* ------------------------------------------------------------------ */

/**
 * How many entries of each list existed at launch. Defaults draw only from these, so a part appended later never
 * changes anyone's default (and so never changes the fallback for a retired part either).
 */
const DEFAULT_POOL: { readonly [S in AvatarSlot | 'sleeve']: number } = {
  skin: 7,
  hair: 7,
  hairColour: 8,
  facialHair: 4,
  face: 3,
  top: 4,
  topColour: 8,
  hat: 7,
  hatColour: 8,
  hatPanel: 8,
  accessory: 4,
  sleeve: 8,
}

const fnv1a = (input: string): number => {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Mulberry32 seeded with FNV-1a of `userId:slotKey`: a stable number in [0, 1) per user and slot. */
const roll = (userId: string, slotKey: string): number => {
  let t = (fnv1a(`${userId}:${slotKey}`) + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const pick = <T>(userId: string, slotKey: string, items: ReadonlyArray<T>): T =>
  items[Math.floor(roll(userId, slotKey) * items.length)]!

const pool = (parts: ReadonlyArray<AvatarPart>, size: number) => parts.slice(0, size).filter((p) => !p.trophy)

/** A player's default look, from free parts only. Same id, same avatar. */
export const defaultAvatar = (userId: string, parts: AvatarParts = AVATAR_PARTS): Avatar => {
  const ids = (slot: AvatarSlot) => pool(parts[slot], DEFAULT_POOL[slot]).map((p) => p.id)
  const sometimes = (slot: AvatarSlot, chance: number) =>
    roll(userId, `${slot}Chance`) < chance
      ? pick(
          userId,
          slot,
          ids(slot).filter((id) => id !== 'none'),
        )
      : 'none'
  const topColour = pick(userId, 'topColour', ids('topColour'))
  return {
    skin: pick(userId, 'skin', ids('skin')),
    hair: pick(userId, 'hair', ids('hair')),
    hairColour: pick(userId, 'hairColour', ids('hairColour')),
    facialHair: sometimes('facialHair', 0.3),
    face: pick(userId, 'face', ids('face')),
    top: pick(userId, 'top', ids('top')),
    topColour,
    hat: sometimes('hat', 0.55),
    hatColour: pick(
      userId,
      'hatColour',
      ids('hatColour').filter((id) => id !== topColour),
    ),
    hatPanel: pick(userId, 'hatPanel', ids('hatPanel')),
    accessory: sometimes('accessory', 0.35),
  }
}

/** The look and sleeve colour every player starts with. */
export const defaultStyle = (userId: string) => ({
  avatar: defaultAvatar(userId),
  sleeveColour: pick(
    userId,
    'sleeve',
    pool(CLOTHING_COLOURS, DEFAULT_POOL.sleeve).map((c) => c.id),
  ),
})

/** Reads a stored avatar: each slot keeps its id if the part still exists, and falls back to the default part if not. */
export const resolveAvatar = (stored: unknown, userId: string): Avatar => {
  const fallback = defaultAvatar(userId)
  const record = typeof stored === 'object' && stored !== null ? (stored as Record<string, unknown>) : {}
  const resolved = { ...fallback } as { -readonly [S in AvatarSlot]: string }
  for (const slot of AVATAR_SLOTS) {
    const id = record[slot]
    if (typeof id === 'string' && partOf(slot, id)) resolved[slot] = id
  }
  return resolved
}

/** How a player with no stored style looks on dense surfaces: their default avatar and sleeve, no title. */
export const defaultLook = (userId: string) => ({
  avatar: defaultAvatar(userId),
  sleeveColour: defaultStyle(userId).sleeveColour,
  title: null,
})
