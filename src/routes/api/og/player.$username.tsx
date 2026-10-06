import { createFileRoute } from '@tanstack/react-router'
import { Effect } from 'effect'
import { formatPercentage } from '#/domain/standings.ts'
import { OgFrame, OgStat, ogResponse, palette, renderOgImage } from '#/server/og/render.tsx'
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
        const { user, stats } = result.value

        const png = await renderOgImage(
          <OgFrame footer={<span>@{user.username}</span>}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
              {user.image ? (
                <img
                  src={user.image}
                  alt=""
                  width={128}
                  height={128}
                  style={{ borderRadius: 999, border: `6px solid ${palette.orange}` }}
                />
              ) : (
                <div
                  style={{
                    width: 128,
                    height: 128,
                    borderRadius: 999,
                    background: palette.orange,
                    color: palette.ink,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Archivo Black',
                    fontSize: 60,
                  }}
                >
                  {user.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div
                style={{ fontFamily: 'Archivo Black', fontSize: 76, lineHeight: 1, letterSpacing: -1, display: 'flex' }}
              >
                {user.name}
              </div>
            </div>
            <div style={{ display: 'flex', marginTop: 'auto', marginBottom: 44 }}>
              <OgStat value={`${stats.wins}-${stats.losses}-${stats.draws}`} label="RECORD" />
              <OgStat value={formatPercentage(stats.winRate)} label="WIN RATE" />
              <OgStat value={String(stats.eventsPlayed)} label="EVENTS" />
              {stats.bestFinish ? <OgStat value={`#${stats.bestFinish}`} label="BEST" /> : null}
            </div>
          </OgFrame>,
        )
        return ogResponse(png, 600)
      },
    },
  },
})
