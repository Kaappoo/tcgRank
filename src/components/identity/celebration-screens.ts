import { achievement, titleName, type AchievementId, type TitleId } from '#/domain/achievements.ts'
import { trophyItem, type TrophyItemId } from '#/domain/avatar-parts.ts'
import type { Unlock } from '#/server/identity/achievements.ts'

export type CelebrationScreen =
  | { readonly kind: 'count'; readonly count: number }
  | { readonly kind: 'trophies'; readonly items: ReadonlyArray<TrophyItemId> }
  | { readonly kind: 'trophy'; readonly item: TrophyItemId }
  | {
      readonly kind: 'badge'
      readonly achievement: AchievementId
      readonly tier: number
      readonly title: TitleId | null
    }

/** The trophy items some unlocks grant, best first. */
const itemsOf = (unlocks: ReadonlyArray<Unlock>): ReadonlyArray<TrophyItemId> => [
  ...new Set(unlocks.flatMap((u) => u.trophies)),
]

/**
 * One unlock per screen, best first: trophy items, then badges, each title on the screen of the badge that earned it.
 * Backfilled tiers (the launch) open with a two-screen welcome instead: one big count, then their trophy items.
 * Anything earned since the launch still gets its own screens after it.
 */
export const celebrationScreens = (unlocks: ReadonlyArray<Unlock>): ReadonlyArray<CelebrationScreen> => {
  const history = unlocks.filter((u) => u.backfilled)
  const fresh = unlocks.filter((u) => !u.backfilled)
  const historyItems = itemsOf(history)
  const welcome: Array<CelebrationScreen> =
    history.length === 0
      ? []
      : [
          { kind: 'count', count: history.length },
          ...(historyItems.length > 0 ? [{ kind: 'trophies' as const, items: historyItems }] : []),
        ]
  return [
    ...welcome,
    ...itemsOf(fresh).map((item) => ({ kind: 'trophy' as const, item })),
    ...fresh.map((u) => ({ kind: 'badge' as const, achievement: u.achievement, tier: u.tier, title: u.title })),
  ]
}

/** Spoken summary of a screen, for its dialog label. */
export const screenLabel = (screen: CelebrationScreen): string => {
  switch (screen.kind) {
    case 'count':
      return `${screen.count} badges from your past events`
    case 'trophies':
      return 'Your trophy items'
    case 'trophy':
      return `Trophy item: ${trophyItem(screen.item).name}`
    case 'badge':
      return `Badge: ${achievement(screen.achievement).name}${screen.title ? `, title ${titleName(screen.title)}` : ''}`
  }
}
