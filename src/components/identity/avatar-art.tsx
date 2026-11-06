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

/*
 * Shapes on a 200 × 200 grid; the frame is the circle r=100 at its centre. The head is the circle r=44 at (100, 94),
 * so its top is y=50, and the ears sit at (56, 98) and (144, 98).
 *
 * The rule that keeps hair sitting on the head: every edge of a front hair shape that faces the face (the hairline,
 * the fringe, the inside of the sideburns) lies inside the head circle or an ear, so no background shows between the
 * hair and the skin. Styles with a back layer (long, bob, afro) may break the rule, because the back layer fills in
 * behind.
 */
const BODY = 'M30 212C30 168 60 148 100 148C140 148 170 168 170 212Z'
const VOLUME =
  'M48 102C42 50 68 32 100 32C132 32 158 50 152 102L142 102C142 86 134 74 124 70C112 76 88 76 76 70C66 74 58 86 58 102Z'
/** Hair pulled back tight: no fringe, the hairline high on the forehead. */
const SLEEK = 'M50 100C46 52 70 36 100 36C130 36 154 52 150 100L142 100C140 80 124 64 100 64C76 64 60 80 58 100Z'
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
/** Shaved sides: the top of the head above the hairline, exactly on the head circle. */
const SHAVED = 'M56.6 100A44 44 0 0 1 143.4 100C138 82 124 72 100 72C76 72 62 82 56.6 100Z'
const AFRO_PUFFS: ReadonlyArray<readonly [number, number]> = [
  [52, 104],
  [46, 80],
  [54, 54],
  [74, 34],
  [100, 26],
  [126, 34],
  [146, 54],
  [154, 80],
  [148, 104],
]
/** Middle part: wavy curtains that fall below the ears, over a back layer that fills in behind the cheeks. */
const MIDDLE_PART_BACK =
  'M48 84C40 60 64 34 100 34C136 34 160 60 152 84C158 100 148 108 154 118C158 128 146 134 138 128H62C54 134 42 128 46 118C52 108 42 100 48 84Z'
const MIDDLE_PART_LEFT =
  'M100 36C72 34 48 50 46 82C44 96 52 102 46 112C42 120 50 128 58 124C60 116 58 108 60 100C62 82 76 62 100 56Z'
const BRAID_LINKS = [108, 120, 132, 144, 156, 168]

/** Hats are drawn 9 units up, so in hat space the head's centre is (100, 103). */
const HAT_HEAD_Y = 103
const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * A band that wraps the head between two heights (hat space): its ends follow a circle a little wider than the head,
 * so it reads as worn on the head rather than floating past it.
 */
export const headBand = (top: number, bottom: number, r = 47): string => {
  const half = (y: number) => round1(Math.sqrt(Math.max(0, r * r - (y - HAT_HEAD_Y) ** 2)))
  const t = half(top)
  const b = half(bottom)
  return `M${round1(100 - t)} ${top}H${round1(100 + t)}A${r} ${r} 0 0 1 ${round1(100 + b)} ${bottom}H${round1(100 - b)}A${r} ${r} 0 0 1 ${round1(100 - t)} ${top}Z`
}

/** Hair in two layers: behind the head (long hair, ponytail, afro…) and over it. */
type HairLayers = { back?: ReactNode; front?: ReactNode }
const HAIR: Record<string, (c: string) => HairLayers> = {
  short: (c: string) => ({ front: <path d={VOLUME} fill={c} /> }),
  spiky: (c: string) => ({
    back: (
      <path
        d="M48 100L30 76L50 70L38 44L64 48L66 18L88 36L100 6L112 36L134 18L136 48L162 44L150 70L170 76L152 100Z"
        fill={shade(c, -0.12)}
      />
    ),
    front: <path d={VOLUME} fill={c} />,
  }),
  long: (c: string) => ({
    back: <path d="M46 100C40 46 68 30 100 30C132 30 160 46 154 100L160 168L40 168Z" fill={shade(c, -0.18)} />,
    front: (
      <path
        d="M48 104C42 50 68 32 100 32C132 32 158 50 152 104C146 84 132 70 112 64C100 74 76 76 60 74C54 82 50 92 48 104Z"
        fill={c}
      />
    ),
  }),
  curly: (c: string) => ({
    front: (
      <g>
        {CURLS.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={17} fill={c} />
        ))}
        <path d={VOLUME} fill={c} />
      </g>
    ),
  }),
  ponytail: (c: string) => ({
    back: <path d="M140 64C172 70 176 124 156 156C152 128 148 104 132 86Z" fill={shade(c, -0.12)} />,
    front: <path d={VOLUME} fill={c} />,
  }),
  buzz: (c: string) => ({
    front: (
      <path
        d="M52 96C48 54 72 40 100 40C128 40 152 54 148 96C142 80 126 70 100 70C74 70 58 80 52 96Z"
        fill={shade(c, 0.12)}
      />
    ),
  }),
  afro: (c: string) => ({
    back: (
      <g fill={shade(c, -0.1)}>
        <circle cx={100} cy={72} r={50} />
        {AFRO_PUFFS.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={16} />
        ))}
      </g>
    ),
    front: <path d="M54 98C50 58 70 42 100 42C130 42 150 58 146 98C140 82 128 72 100 72C72 72 60 82 54 98Z" fill={c} />,
  }),
  mohawk: (c: string) => ({
    front: (
      <g>
        <path d={SHAVED} fill={c} opacity={0.4} />
        <path d="M86 76C82 52 88 22 100 6C112 22 118 52 114 76C106 72 94 72 86 76Z" fill={c} />
      </g>
    ),
  }),
  bob: (c: string) => ({
    back: (
      <path
        d="M46 100C40 46 68 30 100 30C132 30 160 46 154 100L156 128Q142 136 128 128H72Q58 136 44 128Z"
        fill={shade(c, -0.18)}
      />
    ),
    front: (
      <path d="M50 104C44 50 68 32 100 32C132 32 156 50 150 104C146 90 144 82 138 76H62C56 82 54 90 50 104Z" fill={c} />
    ),
  }),
  'side-part': (c: string) => ({
    front: (
      <g>
        <path
          d="M48 102C42 50 68 32 100 32C132 32 158 50 152 102L142 102C142 88 136 76 124 72C108 70 88 66 78 60C68 70 58 84 58 102Z"
          fill={c}
        />
        <path d="M82 35Q80 48 78 60" stroke={shade(c, -0.3)} strokeWidth={2.5} strokeLinecap="round" fill="none" />
      </g>
    ),
  }),
  bun: (c: string) => ({
    front: (
      <g>
        <circle cx={100} cy={30} r={17} fill={c} />
        <path d={SLEEK} fill={c} />
        <path d="M86 40Q100 46 114 40" stroke={shade(c, -0.3)} strokeWidth={3} strokeLinecap="round" fill="none" />
      </g>
    ),
  }),
  pigtails: (c: string) => ({
    back: (
      <g fill={shade(c, -0.12)}>
        <path d="M60 74C30 78 18 118 28 150C36 128 48 110 64 100Z" />
        <path d="M140 74C170 78 182 118 172 150C164 128 152 110 136 100Z" />
      </g>
    ),
    front: (
      <g>
        <path d={SLEEK} fill={c} />
        <path d="M100 37V62" stroke={shade(c, -0.3)} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={58} cy={80} r={5} fill={shade(c, -0.35)} />
        <circle cx={142} cy={80} r={5} fill={shade(c, -0.35)} />
      </g>
    ),
  }),
  'middle-part': (c: string) => ({
    back: <path d={MIDDLE_PART_BACK} fill={shade(c, -0.18)} />,
    front: (
      <g>
        <path d={MIDDLE_PART_LEFT} fill={c} />
        <path d={MIDDLE_PART_LEFT} fill={c} transform="matrix(-1 0 0 1 200 0)" />
        <path
          d="M74 46Q60 60 64 76Q68 90 58 104M126 46Q140 60 136 76Q132 90 142 104"
          stroke={shade(c, -0.22)}
          strokeWidth={2.5}
          strokeLinecap="round"
          fill="none"
        />
      </g>
    ),
  }),
  braids: (c: string) => ({
    front: (
      <g>
        <path d={SLEEK} fill={c} />
        <path d="M100 37V62" stroke={shade(c, -0.3)} strokeWidth={2.5} strokeLinecap="round" />
        {BRAID_LINKS.map((y) => (
          <g key={y}>
            <ellipse cx={54} cy={y} rx={7} ry={7.5} fill={y % 24 === 12 ? shade(c, -0.12) : c} />
            <ellipse cx={146} cy={y} rx={7} ry={7.5} fill={y % 24 === 12 ? shade(c, -0.12) : c} />
          </g>
        ))}
      </g>
    ),
  }),
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
    case 'polo':
      return {
        body: (
          <g>
            <path d={BODY} fill={c} />
            <path d="M88 146Q100 160 112 146Z" fill={skin} />
            <path d="M97 156H103V178H97Z" fill={shade(c, -0.18)} />
            <circle cx={100} cy={164} r={1.8} fill={paper} />
            <circle cx={100} cy={172} r={1.8} fill={paper} />
            <path d="M84 146L100 158L90 168L76 154Z" fill={shade(c, 0.25)} />
            <path d="M116 146L100 158L110 168L124 154Z" fill={shade(c, 0.25)} />
          </g>
        ),
      }
    case 'turtleneck':
      return {
        body: (
          <g>
            <path d={BODY} fill={c} />
            <path d="M84 126Q100 132 116 126V154Q100 160 84 154Z" fill={shade(c, -0.12)} />
            <path
              d="M84 140Q100 146 116 140M84 147Q100 153 116 147"
              stroke={shade(c, -0.28)}
              strokeWidth={2}
              fill="none"
            />
          </g>
        ),
      }
    case 'overalls':
      return {
        body: (
          <g>
            <path d={BODY} fill={paper} />
            <path d="M86 146Q100 162 114 146Z" fill={skin} />
            <path d="M70 176H130V212H70Z" fill={c} />
            <path d="M62 154L76 178M138 154L124 178" stroke={c} strokeWidth={9} strokeLinecap="round" />
            <circle cx={77} cy={180} r={3} fill={shade(c, 0.5)} />
            <circle cx={123} cy={180} r={3} fill={shade(c, 0.5)} />
            <path d="M88 188H112V200H88Z" fill={shade(c, -0.18)} />
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

/** Hats, in hat space: drawn 9 units up from the head. */
const HATS: Record<string, (c: string, panel: string) => ReactNode> = {
  'trainer-cap': (c: string, panel: string) => (
    <g>
      <path d={CROWN} fill={c} />
      <path d={PANEL} fill={panel} />
      <path d="M91 66L100 56L109 66L104.5 66L100 61L95.5 66Z" fill={c} />
      <path d={BRIM} fill={shade(c, -0.25)} />
    </g>
  ),
  'backwards-cap': (c: string, panel: string) => (
    <g>
      <path d={CROWN} fill={c} />
      <path d="M78 76H122V88H78Z" fill={shade(c, -0.3)} />
      <circle cx={89} cy={82} r={2.2} fill={panel} />
      <circle cx={100} cy={82} r={2.2} fill={panel} />
      <circle cx={111} cy={82} r={2.2} fill={panel} />
    </g>
  ),
  beanie: (c: string, panel: string) => (
    <g>
      <circle cx={100} cy={21} r={13} fill={panel} />
      <path d="M50 84C50 36 74 22 100 22C126 22 150 36 150 84Z" fill={c} />
      <path d="M44 72H156V94H44Z" fill={shade(c, -0.2)} />
    </g>
  ),
  visor: (c: string, panel: string) => (
    <g>
      <path d={headBand(70, 84)} fill={c} />
      <path d={VISOR_BRIM} fill={panel} />
    </g>
  ),
  'bucket-hat': (c: string, panel: string) => (
    <g>
      <path d="M54 82C54 34 78 22 100 22C122 22 146 34 146 82Z" fill={c} />
      <path d="M54 70H146V82H54Z" fill={panel} />
      <path d="M28 98L54 78H146L172 98Q100 108 28 98Z" fill={shade(c, -0.2)} />
    </g>
  ),
  headband: (c: string, panel: string) => (
    <g>
      <path d="M140 80L166 70L164 94ZM140 84L162 100L146 104Z" fill={panel} />
      <path d={headBand(74, 88)} fill={c} />
    </g>
  ),
  'champion-cap': (c: string) => (
    <g>
      <path d={CROWN} fill={c} />
      <path d={PANEL} fill={GOLD} />
      <path d="M100 44L104.5 55L116 55L107 62L110.5 74L100 67L89.5 74L93 62L84 55L95.5 55Z" fill={c} />
      <path d={BRIM} fill={GOLD} />
    </g>
  ),
  'top8-visor': (c: string) => (
    <g>
      <path d={headBand(70, 84)} fill={c} />
      <path d={VISOR_BRIM} fill={GOLD} />
    </g>
  ),
  beret: (c: string, panel: string) => (
    <g>
      <path d="M104 30V20" stroke={shade(c, -0.25)} strokeWidth={4} strokeLinecap="round" />
      <path d="M48 78C36 56 64 30 104 30C146 30 170 50 156 70C148 82 120 84 98 82C76 80 58 86 48 78Z" fill={c} />
      <path d="M58 78Q100 70 146 76" stroke={panel} strokeWidth={4} strokeLinecap="round" fill="none" />
    </g>
  ),
  'flat-cap': (c: string, panel: string) => (
    <g>
      <path d="M50 88C48 52 70 38 104 38C136 38 156 54 152 88Z" fill={c} />
      <path d="M60 80C70 58 92 48 128 46" stroke={panel} strokeWidth={3} strokeLinecap="round" fill="none" />
      <path d="M42 88Q100 78 158 88Q150 98 100 96Q50 98 42 88Z" fill={shade(c, -0.25)} />
    </g>
  ),
  'cowboy-hat': (c: string, panel: string) => (
    <g>
      <path d="M62 74C60 42 72 20 88 24C94 26 106 26 112 24C128 20 140 42 138 74Z" fill={c} />
      <path d="M62 64H138V74H62Z" fill={panel} />
      <path
        d="M14 70Q24 92 100 92Q176 92 186 70Q178 62 164 74Q134 84 100 84Q66 84 36 74Q22 62 14 70Z"
        fill={shade(c, -0.18)}
      />
    </g>
  ),
  bandana: (c: string, panel: string) => (
    <g>
      <path d="M138 78L164 68L160 92ZM140 84L166 96L150 104Z" fill={shade(c, -0.2)} />
      <path d="M54 88A47 47 0 0 1 146 88Q100 78 54 88Z" fill={c} />
      <circle cx={84} cy={70} r={2.5} fill={panel} />
      <circle cx={100} cy={64} r={2.5} fill={panel} />
      <circle cx={116} cy={70} r={2.5} fill={panel} />
      <circle cx={92} cy={80} r={2.5} fill={panel} />
      <circle cx={108} cy={80} r={2.5} fill={panel} />
    </g>
  ),
  'top-hat': (c: string, panel: string) => (
    <g>
      <path d="M66 68V14H134V68Z" fill={c} />
      <path d="M66 54H134V66H66Z" fill={panel} />
      <path d="M44 68H156Q160 78 100 78Q40 78 44 68Z" fill={shade(c, -0.25)} />
    </g>
  ),
}

const SILVER = HAIR_COLOURS.find((h) => h.id === 'silver')!.hex!

/** Accessory layers: `over` the clothes, on the `face`, and on `top` of everything, hat included. */
type AccessoryLayers = { over?: ReactNode; face?: ReactNode; top?: ReactNode }
const ACCESSORIES: Record<string, () => AccessoryLayers> = {
  glasses: () => ({
    face: (
      <g fill="none" stroke={AVATAR_INK} strokeWidth={3.5}>
        <rect x={72} y={88} width={22} height={16} rx={5} />
        <rect x={106} y={88} width={22} height={16} rx={5} />
        <path d="M94 95H106" />
      </g>
    ),
  }),
  plaster: () => ({ face: <path d="M114 112l14-6l3 6l-14 6Z" fill={CLOTHING_COLOURS[0]!.hex!} /> }),
  backpack: () => ({
    over: (
      <g>
        <path d="M58 156L70 152L76 212L62 212Z" fill="#5B4634" />
        <path d="M142 156L130 152L124 212L138 212Z" fill="#5B4634" />
      </g>
    ),
  }),
  'league-pin': () => ({
    over: (
      <g>
        <circle cx={128} cy={178} r={9} fill={GOLD} />
        <circle cx={128} cy={178} r={4} fill={shade(GOLD, -0.35)} />
      </g>
    ),
  }),
  sunglasses: () => ({
    face: (
      <g>
        <path d="M70 89H96V97Q96 106 83 106Q70 106 70 97Z" fill={AVATAR_INK} />
        <path d="M104 89H130V97Q130 106 117 106Q104 106 104 97Z" fill={AVATAR_INK} />
        <path d="M94 92H106M70 91L58 89M130 91L142 89" stroke={AVATAR_INK} strokeWidth={3.5} fill="none" />
        <path d="M75 93L80 93M109 93L114 93" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" opacity={0.5} />
      </g>
    ),
  }),
  'round-glasses': () => ({
    face: (
      <g fill="none" stroke={AVATAR_INK} strokeWidth={3}>
        <circle cx={84} cy={97} r={11} />
        <circle cx={116} cy={97} r={11} />
        <path d="M95 95Q100 92 105 95" />
      </g>
    ),
  }),
  headphones: () => ({
    top: (
      <g>
        <path d="M50 98C44 6 156 6 150 98" stroke="#4A4E5A" strokeWidth={7} strokeLinecap="round" fill="none" />
        <rect x={40} y={84} width={18} height={28} rx={7} fill="#2B2E36" />
        <rect x={142} y={84} width={18} height={28} rx={7} fill="#2B2E36" />
        <rect x={45} y={90} width={6} height={16} rx={3} fill="#4A4E5A" />
        <rect x={149} y={90} width={6} height={16} rx={3} fill="#4A4E5A" />
      </g>
    ),
  }),
  earrings: () => ({
    top: (
      <g fill="none" stroke={SILVER} strokeWidth={2.5}>
        <circle cx={55} cy={110} r={4.5} />
        <circle cx={145} cy={110} r={4.5} />
      </g>
    ),
  }),
  scarf: () => ({
    over: (
      <g>
        <path d="M110 150L122 196H106L100 156Z" fill="#22707A" />
        <path d="M108 172H120M110 182H122" stroke={CLOTHING_COLOURS[0]!.hex!} strokeWidth={3} />
        <path d="M68 140Q100 156 132 140L136 156Q100 174 64 156Z" fill="#2C8C99" />
        <path d="M80 147L78 163M100 151V168M120 147L122 163" stroke="#22707A" strokeWidth={4} />
      </g>
    ),
  }),
  freckles: () => ({
    face: (
      <g fill="#8A4A2E" opacity={0.55}>
        <circle cx={76} cy={108} r={1.6} />
        <circle cx={82} cy={111} r={1.6} />
        <circle cx={71} cy={112} r={1.6} />
        <circle cx={124} cy={108} r={1.6} />
        <circle cx={118} cy={111} r={1.6} />
        <circle cx={129} cy={112} r={1.6} />
      </g>
    ),
  }),
}

const MOUSTACHE = 'M84 110C90 104 98 106 100 109C102 106 110 104 116 110C110 114 104 112 100 111C96 112 90 114 84 110Z'

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
      return <path d={MOUSTACHE} fill={c} />
    case 'beard':
      return (
        <path
          d="M58 100C60 134 80 146 100 146C120 146 140 134 142 100C136 116 126 122 116 120C110 112 90 112 84 120C74 122 64 116 58 100Z"
          fill={c}
        />
      )
    case 'goatee':
      return (
        <g fill={c}>
          <path d={MOUSTACHE} />
          <path d="M87 124Q100 129 113 124C115 137 108 147 100 147C92 147 85 137 87 124Z" />
        </g>
      )
    case 'handlebar':
      return (
        <g>
          <path d={MOUSTACHE} fill={c} />
          <path
            d="M86 110Q76 112 74 104M114 110Q124 112 126 104"
            stroke={c}
            strokeWidth={3.5}
            strokeLinecap="round"
            fill="none"
          />
        </g>
      )
    case 'chinstrap':
      return (
        <path
          d="M57 96C58 132 80 146 100 146C120 146 142 132 143 96L139 98C136 124 120 137 100 137C80 137 64 124 61 98Z"
          fill={c}
        />
      )
    case 'full-beard':
      return (
        <g fill={c}>
          <path d="M56 90C54 134 78 154 100 154C122 154 146 134 144 90C140 110 132 120 120 120C112 112 88 112 80 120C68 120 60 110 56 90Z" />
          <path d={MOUSTACHE} />
        </g>
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
  const line = { stroke: AVATAR_INK, strokeWidth: 3.5, strokeLinecap: 'round', fill: 'none' } as const
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
          <path d="M76 88L92 91M124 88L108 91" {...line} />
          <circle cx={84} cy={98} r={4} fill={AVATAR_INK} />
          <circle cx={116} cy={98} r={4} fill={AVATAR_INK} />
          <path d="M92 116H108" {...line} />
        </g>
      )
    case 'wink':
      return (
        <g>
          <circle cx={84} cy={97} r={4.5} fill={AVATAR_INK} />
          <path d="M110 98Q116 92 122 98" {...line} />
          <path d="M90 114Q100 122 110 114" {...line} />
        </g>
      )
    case 'surprised':
      return (
        <g>
          <path d="M77 86Q84 82 91 86M109 86Q116 82 123 86" {...line} strokeWidth={3} />
          <circle cx={84} cy={97} r={5} fill={AVATAR_INK} />
          <circle cx={116} cy={97} r={5} fill={AVATAR_INK} />
          <ellipse cx={100} cy={119} rx={5} ry={6} fill={AVATAR_INK} />
        </g>
      )
    case 'smirk':
      return (
        <g>
          {eyes}
          <path d="M90 117Q102 120 111 112" {...line} />
        </g>
      )
    case 'joyful':
      return (
        <g>
          <path d="M78 99Q84 91 90 99M110 99Q116 91 122 99" {...line} />
          <path d="M88 112H112Q110 126 100 126Q90 126 88 112Z" fill={AVATAR_INK} />
          <path d="M94 121Q100 117 106 121Q104 125 100 125Q96 125 94 121Z" fill="#E07A7A" />
        </g>
      )
    default:
      return (
        <g>
          {eyes}
          <path d="M90 114Q100 122 110 114" {...line} />
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
  const h = HAIR[avatar.hair]?.(hairColour) ?? {}
  const t = top(avatar.top, hexOf(CLOTHING_COLOURS, avatar.topColour), skin)
  const acc = ACCESSORIES[avatar.accessory]?.() ?? {}
  const hatArt = HATS[avatar.hat]?.(hexOf(CLOTHING_COLOURS, avatar.hatColour), hexOf(CLOTHING_COLOURS, avatar.hatPanel))
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
          {acc.top}
        </g>
      </g>
    </svg>
  )
}
