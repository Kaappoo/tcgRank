import type { ReactNode } from 'react'
import satori from 'satori'
import sharp from 'sharp'
import archivo400 from './fonts/archivo-400.woff?inline'
import archivo800 from './fonts/archivo-800.woff?inline'
import archivoBlack from './fonts/archivo-black.woff?inline'

export const OG_WIDTH = 1200
export const OG_HEIGHT = 630

export const palette = {
  ink: '#0b0b0c',
  panel: '#151517',
  line: '#2a2a2e',
  orange: '#ff6a1a',
  ember: '#ff9b52',
  paper: '#f5f2ee',
  muted: '#a19b94',
} as const

const fromDataUrl = (dataUrl: string): ArrayBuffer => {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const bytes = Buffer.from(base64, 'base64')
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

let fonts: Parameters<typeof satori>[1]['fonts'] | undefined
const loadFonts = () =>
  (fonts ??= [
    { name: 'Archivo', data: fromDataUrl(archivo400), weight: 400, style: 'normal' },
    { name: 'Archivo', data: fromDataUrl(archivo800), weight: 800, style: 'normal' },
    { name: 'Archivo Black', data: fromDataUrl(archivoBlack), weight: 400, style: 'normal' },
  ])

/** Renders JSX to a PNG suitable for og:image (WhatsApp, Discord, X, iMessage previews). */
export const renderOgImage = async (node: ReactNode): Promise<Buffer> => {
  const svg = await satori(node, { width: OG_WIDTH, height: OG_HEIGHT, fonts: loadFonts() })
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
}

export const ogResponse = (png: Buffer, maxAge = 300) =>
  new Response(new Uint8Array(png), {
    headers: {
      'content-type': 'image/png',
      'cache-control': `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=86400`,
    },
  })

/** Shared frame: black field, orange slab on the right edge, wordmark bottom-left. */
export const OgFrame = ({ children, footer }: { children: ReactNode; footer: ReactNode }) => (
  <div
    style={{
      width: OG_WIDTH,
      height: OG_HEIGHT,
      display: 'flex',
      background: palette.ink,
      color: palette.paper,
      fontFamily: 'Archivo',
      position: 'relative',
    }}
  >
    <div
      style={{
        position: 'absolute',
        right: -120,
        top: -80,
        width: 520,
        height: 820,
        background: palette.orange,
        transform: 'rotate(14deg)',
        display: 'flex',
      }}
    />
    <div
      style={{
        position: 'absolute',
        right: 170,
        top: -80,
        width: 26,
        height: 820,
        background: palette.ember,
        transform: 'rotate(14deg)',
        display: 'flex',
      }}
    />
    <div style={{ display: 'flex', flexDirection: 'column', padding: '60px 72px', width: 780, height: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>{children}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 26, color: palette.muted }}>
        <div style={{ display: 'flex', fontFamily: 'Archivo Black', color: palette.paper, fontSize: 30, letterSpacing: 1 }}>
          TCG<span style={{ color: palette.orange }}>RANK</span>
        </div>
        <div style={{ width: 2, height: 26, background: palette.line }} />
        {footer}
      </div>
    </div>
  </div>
)

export const OgStat = ({ value, label }: { value: string; label: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', marginRight: 40 }}>
    <div style={{ fontFamily: 'Archivo Black', fontSize: 50, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 22, color: palette.muted, marginTop: 8, fontWeight: 800 }}>{label}</div>
  </div>
)
