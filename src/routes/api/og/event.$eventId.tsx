import { createFileRoute } from '@tanstack/react-router'
import { Effect } from 'effect'
import { EventsService } from '#/server/events/service.ts'
import { OgFrame, OgStat, ogResponse, palette, renderOgImage } from '#/server/og/render.tsx'
import { runtime } from '#/server/runtime.ts'
import { formatLabel, statusLabel } from '#/lib/format.ts'

export const Route = createFileRoute('/api/og/event/$eventId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const detail = await runtime.runPromise(EventsService.use((s) => s.detail(params.eventId)).pipe(Effect.option))
        if (detail._tag === 'None') return new Response('Not found', { status: 404 })
        const { event, standings } = detail.value
        const leader = event.status === 'finished' ? standings[0] : null
        const when = new Date(event.startsAt).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })

        const png = await renderOgImage(
          <OgFrame footer={<span>{event.storeName}</span>}>
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                background: event.status === 'running' ? palette.orange : palette.panel,
                color: event.status === 'running' ? palette.ink : palette.paper,
                border: `2px solid ${event.status === 'running' ? palette.orange : palette.line}`,
                borderRadius: 999,
                padding: '8px 20px',
                fontSize: 22,
                fontWeight: 800,
              }}
            >
              {statusLabel(event.status, event.currentRound)} · {formatLabel(event.format)}
            </div>
            <div
              style={{
                fontFamily: 'Archivo Black',
                fontSize: event.name.length > 18 ? 64 : 84,
                lineHeight: 0.98,
                marginTop: 28,
                letterSpacing: -1,
                display: 'flex',
              }}
            >
              {event.name}
            </div>
            <div style={{ display: 'flex', marginTop: 'auto', marginBottom: 44 }}>
              <OgStat value={String(event.playerCount)} label="PLAYERS" />
              <OgStat value={when} label="DATE" />
              {leader ? (
                <OgStat value={leader.player.name.split(' ')[0] ?? leader.player.name} label="CHAMPION" />
              ) : (
                <OgStat value={event.joinCode} label="JOIN CODE" />
              )}
            </div>
          </OgFrame>,
        )
        return ogResponse(png, event.status === 'running' ? 60 : 600)
      },
    },
  },
})
