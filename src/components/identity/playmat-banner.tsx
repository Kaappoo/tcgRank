/**
 * The playmat banner: a flat, two-tone repeating pattern drawn at a fixed scale, never stretched. The SVG is wider
 * than any header and sliced from the left, so a wider screen shows more tiles rather than bigger ones.
 *
 * Satori-safe: intrinsic SVG elements, literal hex fills, no className or hooks. No gradients, glow or game symbols.
 */
import type { ReactNode } from 'react'
import { BANNERS, clothingHex } from '#/domain/avatar-parts.ts'
import { shade } from './avatar-art.tsx'

const H = 120

/** Draws `count` copies of a tile `step` px apart. */
const repeat = (count: number, draw: (i: number) => ReactNode) => Array.from({ length: count }, (_, i) => draw(i))

const PATTERNS: Record<string, (w: number, c: string, d: string) => ReactNode> = {
  'card-zones': (w, c, d) => (
    <g>
      <rect width={w} height={H} fill={c} />
      {repeat(Math.ceil(w / 70), (i) => (
        <rect
          key={i}
          x={i * 70 + 12}
          y={i % 2 ? 26 : 14}
          width={46}
          height={64}
          rx={5}
          fill="none"
          stroke={d}
          strokeWidth={3}
        />
      ))}
    </g>
  ),
  'prize-grid': (w, c, d) => (
    <g>
      <rect width={w} height={H} fill={c} />
      {repeat(Math.ceil(w / 34) * 3, (k) => {
        const cols = Math.ceil(w / 34)
        const i = k % cols
        const j = Math.floor(k / cols)
        return (
          <rect
            key={k}
            x={i * 34 + 6}
            y={j * 40 + 4}
            width={24}
            height={32}
            rx={3}
            fill={(i * 7 + j * 3) % 5 === 0 ? d : 'none'}
            stroke={d}
            strokeWidth={2}
          />
        )
      })}
    </g>
  ),
  'damage-counters': (w, c, d) => (
    <g>
      <rect width={w} height={H} fill={c} />
      {repeat(Math.ceil(w / 30) * 4, (k) => {
        const cols = Math.ceil(w / 30)
        const i = k % cols
        const j = Math.floor(k / cols)
        return <circle key={k} cx={i * 30 + (j % 2 ? 15 : 0)} cy={j * 30 + 15} r={(i + j) % 3 === 0 ? 9 : 4} fill={d} />
      })}
    </g>
  ),
  slabs: (w, c, d) => (
    <g>
      <rect width={w} height={H} fill={d} />
      {repeat(Math.ceil(w / 120) + 1, (i) => (
        <path key={i} d={`M${i * 120 + 30} 0H${i * 120 + 90}L${i * 120 + 70} ${H}H${i * 120 + 10}Z`} fill={c} />
      ))}
    </g>
  ),
  'led-board': (w, c, d) => (
    <g>
      <rect width={w} height={H} fill={d} />
      {repeat(Math.ceil(w / 12) * 10, (k) => {
        const cols = Math.ceil(w / 12)
        const i = k % cols
        const j = Math.floor(k / cols)
        return (
          <circle
            key={k}
            cx={i * 12 + 6}
            cy={j * 12 + 6}
            r={3.2}
            fill={c}
            opacity={Math.sin(i * 0.35) + Math.cos(j * 0.9) > 0.3 ? 1 : 0.18}
          />
        )
      })}
    </g>
  ),
  'champion-slab': (w, c, d) => (
    <g>
      <rect width={w} height={H} fill={d} />
      {repeat(Math.ceil(w / 240) + 1, (i) => (
        <g key={i}>
          <path d={`M${i * 240 + 90} 0H${i * 240 + 200}L${i * 240 + 176} ${H}H${i * 240 + 66}Z`} fill={c} />
          <path d={`M${i * 240 + 60} 0H${i * 240 + 74}L${i * 240 + 50} ${H}H${i * 240 + 36}Z`} fill={c} />
        </g>
      ))}
    </g>
  ),
}

/** The colour a banner is drawn in: a trophy banner's own, else the banner colour, else the sleeve colour. */
export const bannerHex = (banner: string, bannerColour: string | null, sleeveColour: string): string =>
  BANNERS.find((b) => b.id === banner)?.fixedHex ?? clothingHex(bannerColour ?? sleeveColour)

export function PlaymatBanner({
  banner,
  colour,
  width = 2400,
  height = H,
  style,
}: {
  banner: string
  /** The banner's fill (see `bannerHex`). */
  colour: string
  /** Drawing width in px at scale 1; anything wider than the box is cut off on the right. */
  width?: number
  /** Rendered height in px; the pattern scales uniformly to it. */
  height?: number
  style?: Record<string, string | number>
}) {
  const draw = PATTERNS[banner] ?? PATTERNS['card-zones']!
  const scale = height / H
  return (
    <svg
      aria-hidden
      width={Math.round(width * scale)}
      height={height}
      viewBox={`0 0 ${width} ${H}`}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      {draw(width, colour, shade(colour, -0.35))}
    </svg>
  )
}
