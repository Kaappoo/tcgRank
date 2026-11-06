/**
 * The avatar's drawing: one flat head-and-shoulders bust in a round frame, at any size.
 *
 * Rendered in the browser and by satori for share images, so it stays satori-safe: intrinsic SVG elements only, no
 * `<text>`, no className, no hooks (so no `useId`: clip ids come from props) and literal hex fills.
 */
import type { ReactNode } from 'react'
import {
  AVATAR_FIELD,
  AVATAR_INK,
  CLOTHING_COLOURS,
  GOLD,
  HAIR_COLOURS,
  SKIN_TONES,
  hatCoversHead,
  type Avatar,
} from '#/domain/avatar-parts.ts'

/** Lightens (amount > 0) or darkens (amount < 0) a hex colour, for flat two-tone shading. */
export const shade = (hex: string, amount: number): string => {
  const n = Number.parseInt(hex.slice(1), 16)
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amount < 0 ? c * amount : (255 - c) * amount))))
  const r = f(n >> 16)
  const g = f((n >> 8) & 255)
  const b = f(n & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

const hexOf = (list: ReadonlyArray<{ id: string; hex?: string }>, id: string) =>
  (list.find((p) => p.id === id) ?? list[0]!).hex!

/* Shapes on a 200 × 200 grid; the frame is the circle r=100 at its centre. */
const BODY = 'M30 212C30 168 60 148 100 148C140 148 170 168 170 212Z'
const VOLUME =
  'M48 102C42 50 68 32 100 32C132 32 158 50 152 102C148 86 142 76 132 70C118 75 82 75 68 70C58 76 52 86 48 102Z'
const CROWN = 'M48 90C48 40 72 22 100 22C128 22 152 40 152 90Z'
const PANEL = 'M76 90C76 48 86 28 100 28C114 28 124 48 124 90Z'
const BRIM = 'M40 90Q100 77 160 90Q164 102 100 100Q36 102 40 90Z'
const VISOR_BRIM = 'M40 84Q100 71 160 84Q164 96 100 94Q36 96 40 84Z'
const CURLS: ReadonlyArray<readonly [number, number]> = [
  [50, 92],
  [52, 70],
  [64, 50],
  [82, 36],
  [100, 32],
  [118, 36],
  [136, 50],
  [148, 70],
  [150, 92],
]

/** Hair in two layers: behind the head (long hair, ponytail) and over it. */
const hair = (style: string, c: string): { back?: ReactNode; front?: ReactNode } => {
  switch (style) {
    case 'short':
      return { front: <path d={VOLUME} fill={c} /> }
    case 'spiky':
      return {
        front: (
          <g>
            <path d="M50 70L56 34L72 44L76 18L92 36L100 12L110 36L126 18L130 44L146 34L150 70Z" fill={c} />
            <path d={VOLUME} fill={c} />
          </g>
        ),
      }
    case 'long':
      return {
        back: <path d="M46 100C40 46 68 30 100 30C132 30 160 46 154 100L160 168L40 168Z" fill={shade(c, -0.18)} />,
        front: (
          <path
            d="M48 104C42 50 68 32 100 32C132 32 158 50 152 104C146 84 132 70 112 64C100 74 76 76 60 74C54 82 50 92 48 104Z"
            fill={c}
          />
        ),
      }
    case 'curly':
      return {
        front: (
          <g>
            {CURLS.map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r={17} fill={c} />
            ))}
            <path d={VOLUME} fill={c} />
          </g>
        ),
      }
    case 'ponytail':
      return {
        back: <path d="M140 64C172 70 176 124 156 156C152 128 148 104 132 86Z" fill={shade(c, -0.12)} />,
        front: <path d={VOLUME} fill={c} />,
      }
    case 'buzz':
      return {
        front: (
          <path
            d="M52 96C48 54 72 40 100 40C128 40 152 54 148 96C142 80 126 70 100 70C74 70 58 80 52 96Z"
            fill={shade(c, 0.12)}
          />
        ),
      }
    default:
      return {}
  }
}

const top = (style: string, c: string, skin: string): { behind?: ReactNode; body: ReactNode } => {
  const paper = CLOTHING_COLOURS[0]!.hex!
  switch (style) {
    case 'hoodie':
      return {
        behind: <path d="M58 166C56 128 76 120 100 120C124 120 144 128 142 166Z" fill={shade(c, -0.25)} />,
        body: (
          <g>
            <path d={BODY} fill={c} />
            <path
              d="M93 156V182M107 156V182"
              stroke={shade(c, 0.6)}
              strokeWidth={3}
              strokeLinecap="round"
              fill="none"
            />
          </g>
        ),
      }
    case 'track-jacket':
      return {
        body: (
          <g>
            <path d={BODY} fill={c} />
            <path d="M86 148L100 196L114 148Z" fill={paper} />
            <path d="M86 148L100 196L76 160Z" fill={shade(c, -0.2)} />
            <path d="M114 148L100 196L124 160Z" fill={shade(c, -0.2)} />
            <path d="M40 178L60 162M160 178L140 162" stroke={paper} strokeWidth={4} fill="none" />
          </g>
        ),
      }
    case 'jersey':
      return {
        body: (
          <g>
            <path d={BODY} fill={c} />
            <rect x={30} y={172} width={140} height={10} fill={shade(c, 0.55)} />
            <path d="M86 146Q100 162 114 146Z" fill={shade(c, -0.25)} />
          </g>
        ),
      }
    case 'topcut-jacket':
      return {
        body: (
          <g>
            <path d={BODY} fill={CLOTHING_COLOURS[1]!.hex!} />
            <path d="M86 148L100 196L114 148Z" fill={GOLD} />
            <path d="M38 182L62 160M162 182L138 160" stroke={GOLD} strokeWidth={6} fill="none" />
          </g>
        ),
      }
    default:
      return {
        body: (
          <g>
            <path d={BODY} fill={c} />
            <path d="M86 146Q100 164 114 146Z" fill={skin} />
          </g>
        ),
      }
  }
}

const hat = (style: string, c: string, panel: string): ReactNode => {
  switch (style) {
    case 'trainer-cap':
      return (
        <g>
          <path d={CROWN} fill={c} />
          <path d={PANEL} fill={panel} />
          <path d="M91 66L100 56L109 66L104.5 66L100 61L95.5 66Z" fill={c} />
          <path d={BRIM} fill={shade(c, -0.25)} />
        </g>
      )
    case 'backwards-cap':
      return (
        <g>
          <path d={CROWN} fill={c} />
          <path d="M78 76H122V88H78Z" fill={shade(c, -0.3)} />
          <circle cx={89} cy={82} r={2.2} fill={panel} />
          <circle cx={100} cy={82} r={2.2} fill={panel} />
          <circle cx={111} cy={82} r={2.2} fill={panel} />
        </g>
      )
    case 'beanie':
      return (
        <g>
          <circle cx={100} cy={21} r={13} fill={panel} />
          <path d="M50 84C50 36 74 22 100 22C126 22 150 36 150 84Z" fill={c} />
          <path d="M44 72H156V94H44Z" fill={shade(c, -0.2)} />
        </g>
      )
    case 'visor':
      return (
        <g>
          <path d="M48 70H152V84H48Z" fill={c} />
          <path d={VISOR_BRIM} fill={panel} />
        </g>
      )
    case 'bucket-hat':
      return (
        <g>
          <path d="M54 82C54 34 78 22 100 22C122 22 146 34 146 82Z" fill={c} />
          <path d="M54 70H146V82H54Z" fill={panel} />
          <path d="M28 98L54 78H146L172 98Q100 108 28 98Z" fill={shade(c, -0.2)} />
        </g>
      )
    case 'headband':
      return (
        <g>
          <path d="M48 68H152V82H48Z" fill={c} />
          <path d="M150 70L172 60L170 82Z" fill={panel} />
        </g>
      )
    case 'champion-cap':
      return (
        <g>
          <path d={CROWN} fill={c} />
          <path d={PANEL} fill={GOLD} />
          <path d="M100 44L104.5 55L116 55L107 62L110.5 74L100 67L89.5 74L93 62L84 55L95.5 55Z" fill={c} />
          <path d={BRIM} fill={GOLD} />
        </g>
      )
    case 'top8-visor':
      return (
        <g>
          <path d="M48 70H152V84H48Z" fill={c} />
          <path d={VISOR_BRIM} fill={GOLD} />
        </g>
      )
    default:
      return null
  }
}

const accessory = (style: string): { over?: ReactNode; face?: ReactNode } => {
  switch (style) {
    case 'glasses':
      return {
        face: (
          <g fill="none" stroke={AVATAR_INK} strokeWidth={3.5}>
            <rect x={72} y={88} width={22} height={16} rx={5} />
            <rect x={106} y={88} width={22} height={16} rx={5} />
            <path d="M94 95H106" />
          </g>
        ),
      }
    case 'plaster':
      return { face: <path d="M114 112l14-6l3 6l-14 6Z" fill={CLOTHING_COLOURS[0]!.hex!} /> }
    case 'backpack':
      return {
        over: (
          <g>
            <path d="M58 156L70 152L76 212L62 212Z" fill="#5B4634" />
            <path d="M142 156L130 152L124 212L138 212Z" fill="#5B4634" />
          </g>
        ),
      }
    case 'league-pin':
      return {
        over: (
          <g>
            <circle cx={128} cy={178} r={9} fill={GOLD} />
            <circle cx={128} cy={178} r={4} fill={shade(GOLD, -0.35)} />
          </g>
        ),
      }
    default:
      return {}
  }
}

const facialHair = (style: string, c: string): ReactNode => {
  switch (style) {
    case 'stubble':
      return (
        <path
          d="M60 108C66 134 84 140 100 140C116 140 134 134 140 108C132 126 116 130 100 130C84 130 68 126 60 108Z"
          fill={c}
          opacity={0.45}
        />
      )
    case 'moustache':
      return (
        <path
          d="M84 110C90 104 98 106 100 109C102 106 110 104 116 110C110 114 104 112 100 111C96 112 90 114 84 110Z"
          fill={c}
        />
      )
    case 'beard':
      return (
        <path
          d="M58 100C60 134 80 146 100 146C120 146 140 134 142 100C136 116 126 122 116 120C110 112 90 112 84 120C74 122 64 116 58 100Z"
          fill={c}
        />
      )
    default:
      return null
  }
}

const face = (style: string): ReactNode => {
  const eyes = (
    <g>
      <circle cx={84} cy={97} r={4.5} fill={AVATAR_INK} />
      <circle cx={116} cy={97} r={4.5} fill={AVATAR_INK} />
    </g>
  )
  switch (style) {
    case 'grin':
      return (
        <g>
          {eyes}
          <path d="M88 112H112Q110 126 100 126Q90 126 88 112Z" fill={AVATAR_INK} />
          <path d="M91 113H109V116H91Z" fill="#FFFFFF" />
        </g>
      )
    case 'focused':
      return (
        <g>
          <path
            d="M76 88L92 91M124 88L108 91"
            stroke={AVATAR_INK}
            strokeWidth={3.5}
            strokeLinecap="round"
            fill="none"
          />
          <circle cx={84} cy={98} r={4} fill={AVATAR_INK} />
          <circle cx={116} cy={98} r={4} fill={AVATAR_INK} />
          <path d="M92 116H108" stroke={AVATAR_INK} strokeWidth={3.5} strokeLinecap="round" fill="none" />
        </g>
      )
    default:
      return (
        <g>
          {eyes}
          <path d="M90 114Q100 122 110 114" fill="none" stroke={AVATAR_INK} strokeWidth={3.5} strokeLinecap="round" />
        </g>
      )
  }
}

export interface AvatarArtProps {
  readonly avatar: Avatar
  /** Rendered width and height in px. */
  readonly size: number
  /** Prefix for the clip-path ids. Defaults to one derived from the look, so equal looks share identical clips. */
  readonly clipId?: string
  /** Accessible name; omit for a decorative avatar next to the player's name. */
  readonly label?: string
  readonly style?: Record<string, string | number>
}

const idFor = (avatar: Avatar) => `av-${Object.values(avatar).join('-')}`

/** The bust, drawn hair first, then the hat; a covering hat clips the hair above its brim. */
export function AvatarArt({ avatar, size, clipId, label, style }: AvatarArtProps) {
  const id = clipId ?? idFor(avatar)
  const skin = hexOf(SKIN_TONES, avatar.skin)
  const hairColour = hexOf(HAIR_COLOURS, avatar.hairColour)
  const covers = hatCoversHead(avatar.hat)
  const h = hair(avatar.hair, hairColour)
  const t = top(avatar.top, hexOf(CLOTHING_COLOURS, avatar.topColour), skin)
  const acc = accessory(avatar.accessory)
  const hatArt = hat(avatar.hat, hexOf(CLOTHING_COLOURS, avatar.hatColour), hexOf(CLOTHING_COLOURS, avatar.hatPanel))
  const underHat = (node: ReactNode) => (node && covers ? <g clipPath={`url(#${id}-hair)`}>{node}</g> : node)

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <defs>
        <clipPath id={`${id}-frame`}>
          <circle cx={100} cy={100} r={100} />
        </clipPath>
        {covers ? (
          <clipPath id={`${id}-hair`}>
            <rect x={0} y={56} width={200} height={200} />
          </clipPath>
        ) : null}
      </defs>
      <circle cx={100} cy={100} r={100} fill={AVATAR_FIELD} />
      <g clipPath={`url(#${id}-frame)`}>
        <g>
          {underHat(h.back)}
          {t.behind}
          <path d="M88 120H112V152H88Z" fill={shade(skin, -0.12)} />
          {t.body}
          {acc.over}
          <circle cx={56} cy={98} r={8} fill={shade(skin, -0.08)} />
          <circle cx={144} cy={98} r={8} fill={shade(skin, -0.08)} />
          <circle cx={100} cy={94} r={44} fill={skin} />
          {facialHair(avatar.facialHair, hairColour)}
          {face(avatar.face)}
          {acc.face}
          {underHat(h.front)}
          {hatArt ? <g transform="translate(0 -9)">{hatArt}</g> : null}
        </g>
      </g>
    </svg>
  )
}
