import { and, eq, gt, inArray } from 'drizzle-orm'
import { Clock, Context, Effect, Layer } from 'effect'
import {
  ACHIEVEMENTS,
  BADGE_COUNT,
  earnedTiers,
  isBusy,
  rewardsOf,
  titleFor,
  trophiesFor,
  type AchievementId,
  type EarnedTier,
  type TitleId,
} from '#/domain/achievements.ts'
import type { TrophyItemId } from '#/domain/avatar-parts.ts'
import { withoutLostRewards } from '#/domain/player-style.ts'
import { requireUser } from '../current-user.ts'
import { Db } from '../db/client.ts'
import { earnedTiers as earnedTiersTable, playerStyle } from '../db/schema.ts'
import { loadHistory, loadLiveEvents } from './history.ts'
import { styleOf, styleRows } from './style.ts'

export interface AchievementTierView {
  readonly threshold: number
  readonly title: TitleId | null
  readonly trophies: ReadonlyArray<TrophyItemId>
  /** When it was earned; null if not yet. */
  readonly earnedAt: number | null
}

export interface AchievementView {
  readonly id: AchievementId
  /** "???" for a secret achievement not yet earned. */
  readonly name: string
  readonly description: string
  readonly unit: string
  readonly secret: boolean
  /** A secret achievement nobody may see yet: no name, tiers or progress. */
  readonly hidden: boolean
  readonly tiers: ReadonlyArray<AchievementTierView>
  /** The best tier earned (1-based), 0 when none. */
  readonly bestTier: number
  readonly progress: number
  /** The next threshold to reach, or null once the top tier is earned. */
  readonly next: number | null
}

export interface PlayerAchievements {
  readonly earnedCount: number
  readonly total: number
  readonly achievements: ReadonlyArray<AchievementView>
}

/** A newly earned tier with what it unlocks, for the celebration and the NEW tags. */
export interface Unlock {
  readonly achievement: AchievementId
  readonly tier: number
  readonly earnedAt: number
  readonly title: TitleId | null
  readonly trophies: ReadonlyArray<TrophyItemId>
}

export interface Unseen {
  readonly unlocks: ReadonlyArray<Unlock>
  /** Entered in or hosting a running event: the celebration waits. */
  readonly busy: boolean
  /** The tiers are the launch backfill: the celebration plays the two-screen welcome. */
  readonly welcome: boolean
}

/** The marker the launch backfill sets, so every backfilled tier is new once. */
export const BACKFILL_SEEN_AT = new Date(0)

/** Best first: tiers with trophy items, then tiers with titles, then higher tiers, then the rest by recency. */
const bestFirst = (a: Unlock, b: Unlock) =>
  b.trophies.length - a.trophies.length ||
  Number(b.title !== null) - Number(a.title !== null) ||
  b.tier - a.tier ||
  b.earnedAt - a.earnedAt

const make = Effect.gen(function* () {
  const db = yield* Db

  const storedTiers = (userId: string) =>
    db
      .query((d) => d.select().from(earnedTiersTable).where(eq(earnedTiersTable.userId, userId)))
      .pipe(
        Effect.map((rows) =>
          rows.map((r): EarnedTier => ({
            achievement: r.achievementId as AchievementId,
            tier: r.tier,
            earnedAt: r.earnedAt.getTime(),
          })),
        ),
      )

  /**
   * Recalculates each player's tiers from their full history, replaces the stored rows, and takes back anything a lost
   * tier unlocked (ADR 0004). Nothing is announced.
   */
  const refresh = Effect.fn('AchievementsService.refresh')(function* (userIds: ReadonlyArray<string>) {
    const unique = [...new Set(userIds)]
    const styles = yield* styleRows(unique)
    for (const userId of unique) {
      const { earned } = earnedTiers(yield* loadHistory(userId))
      const row = styles.get(userId)
      const rewards = rewardsOf(earned)
      const style = styleOf(userId, row)
      const repaired = withoutLostRewards(style, rewards, userId)
      yield* db.query((d) =>
        d.batch([
          d.delete(earnedTiersTable).where(eq(earnedTiersTable.userId, userId)),
          ...(earned.length > 0
            ? [
                d.insert(earnedTiersTable).values(
                  earned.map((e) => ({
                    userId,
                    achievementId: e.achievement,
                    tier: e.tier,
                    earnedAt: new Date(e.earnedAt),
                  })),
                ),
              ]
            : []),
          ...(row && JSON.stringify(repaired) !== JSON.stringify(style)
            ? [
                d
                  .update(playerStyle)
                  .set({
                    avatar: repaired.avatar,
                    banner: repaired.banner,
                    titleId: repaired.title,
                    showcase: [...repaired.showcase],
                  })
                  .where(eq(playerStyle.userId, userId)),
              ]
            : []),
        ]),
      )
    }
  })

  /** Every achievement with the player's tiers and progress, for the profile's Achievements tab. */
  const forPlayer = Effect.fn('AchievementsService.forPlayer')(function* (userId: string) {
    const [earned, history] = yield* Effect.all([storedTiers(userId), loadHistory(userId)], {
      concurrency: 'unbounded',
    })
    const { progress } = earnedTiers(history)
    const achievements = ACHIEVEMENTS.map((a): AchievementView => {
      const tiers = a.tiers.map((t, index): AchievementTierView => ({
        threshold: t.threshold,
        title: t.title ?? null,
        trophies: trophiesFor(a.id, index + 1),
        earnedAt: earned.find((e) => e.achievement === a.id && e.tier === index + 1)?.earnedAt ?? null,
      }))
      const bestTier = tiers.filter((t) => t.earnedAt !== null).length
      const hidden = a.secret && bestTier === 0
      return {
        id: a.id,
        name: hidden ? '???' : a.name,
        description: hidden ? 'A secret achievement' : a.description,
        unit: a.unit,
        secret: a.secret,
        hidden,
        tiers: hidden ? [] : tiers,
        bestTier,
        progress: hidden ? 0 : progress[a.id],
        next: hidden ? null : (a.tiers[bestTier]?.threshold ?? null),
      }
    })
    return { earnedCount: earned.length, total: BADGE_COUNT, achievements } satisfies PlayerAchievements
  })

  /** The signed-in player's tiers earned after their last-seen marker, best first, and whether they are busy. */
  const unseen = Effect.fn('AchievementsService.unseen')(function* () {
    const me = yield* requireUser
    const [styles, live] = yield* Effect.all([styleRows([me.id]), loadLiveEvents(me.id)], { concurrency: 'unbounded' })
    const seenAt = styles.get(me.id)?.achievementsSeenAt ?? new Date(yield* Clock.currentTimeMillis)
    const rows = yield* db.query((d) =>
      d
        .select()
        .from(earnedTiersTable)
        .where(and(eq(earnedTiersTable.userId, me.id), gt(earnedTiersTable.earnedAt, seenAt))),
    )
    const unlocks = rows
      .map((r): Unlock => {
        const id = r.achievementId as AchievementId
        return {
          achievement: id,
          tier: r.tier,
          earnedAt: r.earnedAt.getTime(),
          title: titleFor(id, r.tier),
          trophies: trophiesFor(id, r.tier),
        }
      })
      .filter((u) => ACHIEVEMENTS.some((a) => a.id === u.achievement))
      .sort(bestFirst)
    return {
      unlocks,
      busy: isBusy(live),
      welcome: seenAt.getTime() === BACKFILL_SEEN_AT.getTime() && unlocks.length > 0,
    } satisfies Unseen
  })

  /** Moves the signed-in player's marker to now: called when they open the Achievements tab, never on dismiss. */
  const markSeen = Effect.fn('AchievementsService.markSeen')(function* () {
    const me = yield* requireUser
    const now = new Date(yield* Clock.currentTimeMillis)
    yield* db.query((d) => d.update(playerStyle).set({ achievementsSeenAt: now }).where(eq(playerStyle.userId, me.id)))
  })

  /** The earned tiers of some players, by user id. */
  const earnedBy = Effect.fn('AchievementsService.earnedBy')(function* (userIds: ReadonlyArray<string>) {
    if (userIds.length === 0) return new Map<string, Array<EarnedTier>>()
    const rows = yield* db.query((d) =>
      d
        .select()
        .from(earnedTiersTable)
        .where(inArray(earnedTiersTable.userId, [...new Set(userIds)])),
    )
    const by = new Map<string, Array<EarnedTier>>()
    for (const r of rows) {
      const list = by.get(r.userId) ?? []
      list.push({ achievement: r.achievementId as AchievementId, tier: r.tier, earnedAt: r.earnedAt.getTime() })
      by.set(r.userId, list)
    }
    return by
  })

  return { refresh, forPlayer, unseen, markSeen, earned: storedTiers, earnedBy }
})

export class AchievementsService extends Context.Service<AchievementsService, Effect.Success<typeof make>>()(
  'tcgrank/server/identity/AchievementsService',
) {
  static readonly layer = Layer.effect(AchievementsService, make)
}
