import { createFileRoute } from '@tanstack/react-router'
import { Effect } from 'effect'
import { EventsService } from '#/server/events/service.ts'
import { eventCard } from '#/server/og/event-card.ts'
import { OgFrame, OgStat, ogResponse, palette, renderOgImage } from '#/server/og/render.tsx'
import { runtime } from '#/server/runtime.ts'

/** The event as its card shows it. A private event's card would give away its name and code, so it gets none. */
const cardDetail = (eventId: string) =>
  runtime.runPromise(
    EventsService.use((s) => s.detail(eventId)).pipe(
      Effect.catchTag('CodeRequired', () => Effect.succeed('private' as const)),
      Effect.orElseSucceed(() => 'missing' as const),
    ),
  )

export const Route = createFileRoute('/api/og/event/$eventId')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const detail = await cardDetail(params.eventId)
        if (detail === 'missing') return new Response('Not found', { status: 404 })
        if (detail === 'private') return Response.redirect(new URL('/api/og/default', request.url), 302)
        const { event } = detail
        const { pill, champion } = eventCard(detail)
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
              {pill}
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
              {champion ? (
                <OgStat value={champion} label="CHAMPION" />
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
