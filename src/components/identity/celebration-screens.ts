import { achievement, titleName, type AchievementId, type TitleId } from '#/domain/achievements.ts'
import { TROPHY_ITEMS, type TrophyItemId } from '#/domain/avatar-parts.ts'
import type { Unseen } from '#/server/identity/achievements.ts'

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

/**
 * One unlock per screen, best first: trophy items, then badges, each title on the screen of the badge that earned it.
 * The launch welcome is two screens instead: one big count, then the trophy items.
 */
export const celebrationScreens = (unseen: Pick<Unseen, 'unlocks' | 'welcome'>): ReadonlyArray<CelebrationScreen> => {
  const items = TROPHY_ITEMS.filter((t) => unseen.unlocks.some((u) => u.trophies.includes(t.id))).map((t) => t.id)
  if (unseen.welcome) {
    return [
      { kind: 'count', count: unseen.unlocks.length },
      ...(items.length > 0 ? [{ kind: 'trophies' as const, items }] : []),
    ]
  }
  return [
    ...items.map((item) => ({ kind: 'trophy' as const, item })),
    ...unseen.unlocks.map((u) => ({
      kind: 'badge' as const,
      achievement: u.achievement,
      tier: u.tier,
      title: u.title,
    })),
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
      return `Trophy item: ${TROPHY_ITEMS.find((t) => t.id === screen.item)!.name}`
    case 'badge':
      return `Badge: ${achievement(screen.achievement).name}${screen.title ? `, title ${titleName(screen.title)}` : ''}`
  }
}
