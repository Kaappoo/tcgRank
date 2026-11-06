import { inArray } from 'drizzle-orm'
import { Effect } from 'effect'
import { ACHIEVEMENT_IDS, TITLE_IDS, type AchievementId, type TitleId } from '#/domain/achievements.ts'
import {
  BANNERS,
  CLOTHING_COLOURS,
  DEFAULT_BANNER,
  defaultStyle,
  resolveAvatar,
  type Avatar,
} from '#/domain/avatar-parts.ts'
import { Db } from '../db/client.ts'
import { playerStyle, user, type PlayerStyleRow } from '../db/schema.ts'
import type { PlayerRef } from '../events/views.ts'

/** What dense surfaces show of a player: the avatar, the sleeve colour and the shown title. */
export interface PlayerLook {
  readonly avatar: Avatar
  readonly sleeveColour: string
  readonly title: TitleId | null
}

export interface PartnerPokemon {
  readonly cardId: string
  readonly name: string
  readonly setName: string | null
  readonly imageUrl: string | null
}

/** A player's whole identity, resolved: every id exists, defaults applied. */
export interface PlayerStyle extends PlayerLook {
  readonly banner: string
  /** A clothing colour id; null matches the sleeve. */
  readonly bannerColour: string | null
  /** Up to 3 achievements, in the order picked. */
  readonly showcase: ReadonlyArray<AchievementId>
  readonly featuredDeckId: string | null
  readonly partner: PartnerPokemon | null
}

const isTitle = (id: string | null | undefined): id is TitleId => TITLE_IDS.includes(id as TitleId)
const isAchievement = (id: unknown): id is AchievementId => ACHIEVEMENT_IDS.includes(id as AchievementId)
const isClothing = (id: string | null | undefined) => CLOTHING_COLOURS.some((c) => c.id === id)

/** Columns a dense surface reads, to select next to the user. */
const lookColumns = {
  styleAvatar: playerStyle.avatar,
  styleSleeve: playerStyle.sleeveColour,
  styleTitle: playerStyle.titleId,
}

/** Resolves the look from `lookColumns` (all null when the row is missing). */
const lookOf = (
  userId: string,
  row: { styleAvatar: unknown; styleSleeve: string | null; styleTitle: string | null },
): PlayerLook => ({
  avatar: resolveAvatar(row.styleAvatar, userId),
  sleeveColour: isClothing(row.styleSleeve) ? row.styleSleeve! : defaultStyle(userId).sleeveColour,
  title: isTitle(row.styleTitle) ? row.styleTitle : null,
})

/** Resolves a stored row (or none) into the identity views show. */
export const styleOf = (userId: string, row: PlayerStyleRow | null | undefined): PlayerStyle => ({
  ...lookOf(userId, {
    styleAvatar: row?.avatar ?? null,
    styleSleeve: row?.sleeveColour ?? null,
    styleTitle: row?.titleId ?? null,
  }),
  banner: BANNERS.some((b) => b.id === row?.banner) ? row!.banner : DEFAULT_BANNER,
  bannerColour: isClothing(row?.bannerColour) ? row!.bannerColour : null,
  showcase: (row?.showcase ?? []).filter(isAchievement).slice(0, 3),
  featuredDeckId: row?.featuredDeckId ?? null,
  partner:
    row?.partnerCardId && row.partnerName
      ? {
          cardId: row.partnerCardId,
          name: row.partnerName,
          setName: row.partnerSetName,
          imageUrl: row.partnerImageUrl,
        }
      : null,
})

/**
 * Stores the default look and sleeve colour for users who have no style yet: new accounts, new guests and the launch
 * backfill. `seenAt` is the achievements marker: tiers earned after it are new.
 */
export const insertDefaultStyles = Effect.fn('insertDefaultStyles')(function* (
  userIds: ReadonlyArray<string>,
  seenAt: Date,
) {
  if (userIds.length === 0) return
  const db = yield* Db
  yield* db.query((d) =>
    d
      .insert(playerStyle)
      .values(
        userIds.map((userId) => {
          const { avatar, sleeveColour } = defaultStyle(userId)
          return { userId, avatar, sleeveColour, achievementsSeenAt: seenAt }
        }),
      )
      .onConflictDoNothing(),
  )
})

/** The stored rows for some users, by user id. */
export const styleRows = Effect.fn('styleRows')(function* (userIds: ReadonlyArray<string>) {
  if (userIds.length === 0) return new Map<string, PlayerStyleRow>()
  const db = yield* Db
  const rows = yield* db.query((d) =>
    d
      .select()
      .from(playerStyle)
      .where(inArray(playerStyle.userId, [...new Set(userIds)])),
  )
  return new Map(rows.map((r) => [r.userId, r]))
})

/** Select with `.leftJoin(playerStyle, eq(playerStyle.userId, user.id))`; resolve with `toPlayerRef`. */
export const playerRefColumns = {
  id: user.id,
  name: user.name,
  username: user.username,
  ...lookColumns,
}

/** A player as views show them, with their look resolved from the style columns. */
export const toPlayerRef = (
  row: { id: string; name: string; username: string | null } & Parameters<typeof lookOf>[1],
): PlayerRef => ({ id: row.id, name: row.name, username: row.username, ...lookOf(row.id, row) })
