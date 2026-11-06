/**
 * A badge: one shape per achievement in paper and ink, the tier's threshold in the numerals face (a drawn ★ for a
 * one-off achievement), and trophy gold only on an achievement's top tier.
 *
 * Satori-safe, like the avatar: inline styles only, no className or hooks, and the number set in a positioned element
 * outside the SVG (satori can't draw SVG `<text>`).
 */
import { achievement, isOneOff, isTopTier, type AchievementId } from '#/domain/achievements.ts'
import { AVATAR_INK, GOLD } from '#/domain/avatar-parts.ts'

const PAPER = '#F4EFE8'
/** Drawn, not typed: the share image's fonts have no ★. */
const STAR = 'M50 30L55.9 43.1L70 44.6L59.4 54.1L62.4 68L50 60.9L37.6 68L40.6 54.1L30 44.6L44.1 43.1Z'

const SHAPES = {
  circle: 'M50 6a44 44 0 1 0 0.1 0Z',
  hex: 'M50 4L90 27V73L50 96L10 73V27Z',
  shield: 'M50 4L90 16V50C90 74 72 90 50 98C28 90 10 74 10 50V16Z',
  diamond: 'M50 2L98 50L50 98L2 50Z',
  square: 'M14 8H86Q92 8 92 14V86Q92 92 86 92H14Q8 92 8 86V14Q8 8 14 8Z',
} as const

const SHAPE_OF: Record<AchievementId, keyof typeof SHAPES> = {
  regular: 'circle',
  'match-winner': 'hex',
  champion: 'shield',
  'top-cut': 'diamond',
  host: 'square',
  'clean-sweep': 'hex',
  brewer: 'square',
  undefeated: 'shield',
  explorer: 'circle',
  loyal: 'square',
  comeback: 'shield',
  marathon: 'diamond',
  rival: 'hex',
}

/** "Champion 1", "Regular 25", "Undefeated": how a badge is named. */
export const badgeName = (id: AchievementId, tier: number): string => {
  const a = achievement(id)
  return isOneOff(id) ? a.name : `${a.name} ${a.tiers[tier - 1]?.threshold ?? tier}`
}

export function AchievementBadge({
  achievement: id,
  tier,
  size,
  fontFamily = "'Archivo Variable', Archivo, sans-serif",
}: {
  achievement: AchievementId
  /** 1-based. */
  tier: number
  size: number
  fontFamily?: string
}) {
  const shape = SHAPES[SHAPE_OF[id]]
  const gold = isTopTier(id, tier) && !isOneOff(id)
  const oneOff = isOneOff(id)
  const label = String(achievement(id).tiers[tier - 1]?.threshold ?? tier)
  return (
    <div
      role="img"
      aria-label={badgeName(id, tier)}
      style={{ position: 'relative', display: 'flex', width: size, height: size, flexShrink: 0 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        aria-hidden
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <path d={shape} fill={gold ? GOLD : PAPER} />
        <path
          d={shape}
          fill="none"
          stroke={AVATAR_INK}
          strokeWidth={5}
          transform="translate(50 50) scale(0.84) translate(-50 -50)"
        />
        {oneOff ? <path d={STAR} fill={AVATAR_INK} /> : null}
      </svg>
      {oneOff ? null : (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: size,
            height: size,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: AVATAR_INK,
            fontFamily,
            fontWeight: 800,
            fontStretch: '72%',
            fontVariantNumeric: 'tabular-nums',
            fontSize: Math.round(size * (label.length > 2 ? 0.3 : 0.4)),
            lineHeight: 1,
          }}
        >
          {label}
        </div>
      )}
    </div>
  )
}
