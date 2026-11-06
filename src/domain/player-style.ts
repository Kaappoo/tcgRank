/**
 * Which identity choices a player's rewards allow: what saving refuses, and what a refresh quietly takes back when a
 * correction removes a tier (ADR 0004). Pure, no IO.
 */
import { achievement, titleName, type AchievementId, type Rewards, type TitleId } from './achievements.ts'
import {
  AVATAR_SLOTS,
  BANNERS,
  DEFAULT_BANNER,
  defaultAvatar,
  partOf,
  trophyItem,
  type Avatar,
} from './avatar-parts.ts'

export interface RewardChoices {
  readonly avatar: Avatar
  readonly banner: string
  readonly title: TitleId | null
  readonly showcase: ReadonlyArray<AchievementId>
}

const MAX_SHOWCASE = 3

/** Why these choices can't be saved, or null when every trophy item, title and badge is earned. */
export const unearnedChoice = (choices: RewardChoices, rewards: Rewards): string | null => {
  for (const slot of AVATAR_SLOTS) {
    const trophy = partOf(slot, choices.avatar[slot])?.trophy
    if (trophy && !rewards.trophies.has(trophy)) return `You haven’t earned the ${trophyItem(trophy).name} yet`
  }
  const banner = BANNERS.find((b) => b.id === choices.banner)
  if (banner?.trophy && !rewards.trophies.has(banner.trophy)) return `You haven’t earned the ${banner.name} yet`
  if (choices.title && !rewards.titles.has(choices.title))
    return `You haven’t earned the ${titleName(choices.title)} title yet`
  if (choices.showcase.length > MAX_SHOWCASE) return `Show up to ${MAX_SHOWCASE} badges`
  if (new Set(choices.showcase).size !== choices.showcase.length) return 'Each badge can only be shown once'
  const unearned = choices.showcase.find((id) => !rewards.achievements.has(id))
  if (unearned) return `You haven’t earned a ${achievement(unearned).name} badge yet`
  return null
}

/**
 * Takes back what is no longer earned, silently: a trophy item falls back to the player's default part, a lost title
 * becomes none and a lost badge leaves the showcase.
 */
export const withoutLostRewards = <C extends RewardChoices>(choices: C, rewards: Rewards, userId: string): C => {
  const fallback = defaultAvatar(userId)
  const avatar = { ...choices.avatar } as { -readonly [S in keyof Avatar]: string }
  for (const slot of AVATAR_SLOTS) {
    const trophy = partOf(slot, avatar[slot])?.trophy
    if (trophy && !rewards.trophies.has(trophy)) avatar[slot] = fallback[slot]
  }
  const bannerTrophy = BANNERS.find((b) => b.id === choices.banner)?.trophy
  return {
    ...choices,
    avatar,
    banner: bannerTrophy && !rewards.trophies.has(bannerTrophy) ? DEFAULT_BANNER : choices.banner,
    title: choices.title && rewards.titles.has(choices.title) ? choices.title : null,
    showcase: choices.showcase.filter((id) => rewards.achievements.has(id)),
  }
}
