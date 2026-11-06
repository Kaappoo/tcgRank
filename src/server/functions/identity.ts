import { createServerFn } from '@tanstack/react-start'
import { partnerSearchInput, playerStyleInput, titleInput, trophyItemInput, userIdInput } from '#/shared/schemas.ts'
import type { TitleId } from '#/domain/achievements.ts'
import { runServerEffect } from '../effect/run.ts'
import { AchievementsService } from '../identity/achievements.ts'
import { PlayerStyleService } from '../identity/player-style.ts'

export const getAchievements = createServerFn({ method: 'GET' })
  .validator(userIdInput)
  .handler(({ data }) => runServerEffect(AchievementsService.use((s) => s.forPlayer(data.userId))))

export const getUnseenUnlocks = createServerFn({ method: 'GET' }).handler(() =>
  runServerEffect(AchievementsService.use((s) => s.unseen())),
)

export const markAchievementsSeen = createServerFn({ method: 'POST' }).handler(() =>
  runServerEffect(AchievementsService.use((s) => s.markSeen())),
)

export const getStyleEditor = createServerFn({ method: 'GET' }).handler(() =>
  runServerEffect(PlayerStyleService.use((s) => s.editor())),
)

export const savePlayerStyle = createServerFn({ method: 'POST' })
  .validator(playerStyleInput)
  .handler(({ data }) => runServerEffect(PlayerStyleService.use((s) => s.save(data))))

export const wearTrophyItem = createServerFn({ method: 'POST' })
  .validator(trophyItemInput)
  .handler(({ data }) => runServerEffect(PlayerStyleService.use((s) => s.wear(data.item))))

export const showTitle = createServerFn({ method: 'POST' })
  .validator(titleInput)
  .handler(({ data }) => runServerEffect(PlayerStyleService.use((s) => s.showTitle(data.title as TitleId | null))))

export const searchPartnerCards = createServerFn({ method: 'GET' })
  .validator(partnerSearchInput)
  .handler(({ data }) => runServerEffect(PlayerStyleService.use((s) => s.searchPartner(data.query, data.page))))
