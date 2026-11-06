import { AchievementBadge } from '#/components/identity/achievement-badge.tsx'
import { AvatarArt } from '#/components/identity/avatar-art.tsx'
import { PlaymatBanner, bannerHex } from '#/components/identity/playmat-banner.tsx'
import { titleName, type AchievementId, type TitleId } from '#/domain/achievements.ts'
import { GOLD, type Avatar } from '#/domain/avatar-parts.ts'
import { OG_HEIGHT, OG_WIDTH, palette } from './render.tsx'

export interface PlayerOgData {
  readonly name: string
  readonly username: string | null
  readonly avatar: Avatar
  readonly title: TitleId | null
  readonly sleeveColour: string
  readonly banner: string
  readonly bannerColour: string | null
  readonly badges: ReadonlyArray<{ readonly achievement: AchievementId; readonly tier: number }>
  readonly record: string
  readonly summary: string
}

const BAND = 200

/**
 * The profile share image, mirroring the trainer card: the banner across the top band, the avatar overlapping it,
 * then title, name and lifetime record, with the orange slab on the right.
 */
export function PlayerOgCard({ player }: { player: PlayerOgData }) {
  return (
    <div
      style={{
        width: OG_WIDTH,
        height: OG_HEIGHT,
        display: 'flex',
        position: 'relative',
        background: palette.ink,
        color: palette.paper,
        fontFamily: 'Archivo',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: OG_WIDTH,
          height: BAND,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        <PlaymatBanner
          banner={player.banner}
          colour={bannerHex(player.banner, player.bannerColour, player.sleeveColour)}
          width={OG_WIDTH}
          height={BAND}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          right: -60,
          top: -80,
          width: 170,
          height: 820,
          background: palette.orange,
          transform: 'rotate(12deg)',
          display: 'flex',
        }}
      />
      <div style={{ position: 'absolute', left: 64, top: 110, display: 'flex', alignItems: 'flex-end', gap: 28 }}>
        <div
          style={{ display: 'flex', borderRadius: 999, border: `8px solid ${palette.ink}`, background: palette.ink }}
        >
          <AvatarArt avatar={player.avatar} size={184} clipId="og-avatar" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8, maxWidth: 720 }}>
          {player.title ? (
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                border: `2px solid ${GOLD}`,
                color: GOLD,
                borderRadius: 999,
                padding: '4px 14px',
                fontSize: 22,
                fontWeight: 800,
              }}
            >
              {titleName(player.title)}
            </div>
          ) : null}
          <div style={{ display: 'flex', fontFamily: 'Archivo Black', fontSize: 60, lineHeight: 1, letterSpacing: -1 }}>
            {player.name}
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 64, bottom: 56, display: 'flex', alignItems: 'flex-end', gap: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 22, color: palette.muted, fontWeight: 800 }}>LIFETIME RECORD</div>
          <div style={{ display: 'flex', fontFamily: 'Archivo Black', fontSize: 96, lineHeight: 1 }}>
            {player.record}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 10 }}>
          {player.badges.length > 0 ? (
            <div style={{ display: 'flex', gap: 12 }}>
              {player.badges.map((b) => (
                <AchievementBadge
                  key={b.achievement}
                  achievement={b.achievement}
                  tier={b.tier}
                  size={56}
                  fontFamily="Archivo"
                />
              ))}
            </div>
          ) : null}
          <div style={{ display: 'flex', fontSize: 24, color: palette.muted }}>
            {player.username ? `@${player.username} · ` : ''}
            {player.summary} · tcgRank
          </div>
        </div>
      </div>
    </div>
  )
}
