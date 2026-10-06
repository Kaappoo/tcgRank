import { createFileRoute } from '@tanstack/react-router'
import { OgFrame, ogResponse, palette, renderOgImage } from '#/server/og/render.tsx'

export const Route = createFileRoute('/api/og/default')({
  server: {
    handlers: {
      GET: async () => {
        const png = await renderOgImage(
          <OgFrame footer={<span>League night, sorted.</span>}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'Archivo Black',
                fontSize: 104,
                lineHeight: 0.92,
                letterSpacing: -2,
                marginTop: 40,
              }}
            >
              <span>Scan in.</span>
              <span>Get paired.</span>
              <span style={{ color: palette.orange }}>Play.</span>
            </div>
          </OgFrame>,
        )
        return ogResponse(png, 86_400)
      },
    },
  },
})
