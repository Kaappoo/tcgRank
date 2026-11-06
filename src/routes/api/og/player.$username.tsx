import { createFileRoute } from '@tanstack/react-router'
import { Effect } from 'effect'
import { formatPercentage } from '#/domain/standings.ts'
import { PlayerOgCard } from '#/server/og/player-card.tsx'
import { ogResponse, renderOgImage } from '#/server/og/render.tsx'
import { ProfilesService } from '#/server/profiles/service.ts'
import { runtime } from '#/server/runtime.ts'

export const Route = createFileRoute('/api/og/player/$username')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const result = await runtime.runPromise(
          ProfilesService.use((s) => s.byUsername(params.username)).pipe(Effect.option),
        )
        if (result._tag === 'None') return new Response('Not found', { status: 404 })
        const { user, stats, identity } = result.value
        const best = stats.bestFinish ? ` · best #${stats.bestFinish}` : ''

        const png = await renderOgImage(
          <PlayerOgCard
            player={{
              ...user,
              ...identity,
              record: `${stats.wins}-${stats.losses}-${stats.draws}`,
              summary: `${stats.eventsPlayed} events · ${formatPercentage(stats.winRate)}${best}`,
            }}
          />,
        )
        return ogResponse(png, 600)
      },
    },
  },
})
