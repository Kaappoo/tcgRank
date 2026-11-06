import { Link } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'
import type { AchievementId, TitleId } from '#/domain/achievements.ts'
import type { Avatar as AvatarValue } from '#/domain/avatar-parts.ts'
import { Avatar } from '#/components/ui/avatar.tsx'
import { LocalTime } from '#/components/ui/local-time.tsx'
import { cn } from '#/lib/utils.ts'
import type { PartnerPokemon } from '#/server/identity/style.ts'
import { AchievementBadge, badgeName } from './achievement-badge.tsx'
import { PlaymatBanner, bannerHex } from './playmat-banner.tsx'
import { TitleChip } from './title-chip.tsx'

export interface TrainerCardData {
  readonly name: string
  readonly username: string | null
  readonly playerId?: string | null
  readonly joinedAt?: number
  readonly bio?: string | null
  readonly avatar: AvatarValue
  readonly title: TitleId | null
  readonly sleeveColour: string
  readonly banner: string
  readonly bannerColour: string | null
  readonly partner: PartnerPokemon | null
  readonly badges: ReadonlyArray<{ readonly achievement: AchievementId; readonly tier: number }>
}

/** The partner Pokémon's card, tucked at an angle beside the avatar. */
export function PartnerCard({ partner, className }: { partner: PartnerPokemon; className?: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <figure
      data-slot="partner"
      className={cn(
        'aspect-[63/88] w-14 shrink-0 rotate-[8deg] overflow-hidden rounded-[6%] border border-line bg-surface-raised shadow-[0_8px_20px_-10px_rgb(0_0_0/0.9)] sm:w-16',
        className,
      )}
    >
      {partner.imageUrl && !failed ? (
        <img
          src={partner.imageUrl}
          alt={`Partner Pokémon: ${partner.name}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <figcaption className="flex size-full items-end p-1.5 text-[10px] leading-tight font-semibold">
          {partner.name}
        </figcaption>
      )}
    </figure>
  )
}

const Ghost = ({ className, label }: { className?: string; label: string }) => (
  <span aria-hidden title={label} className={cn('shrink-0 border-2 border-dashed border-line-strong', className)} />
)

/**
 * The profile header: playmat banner, avatar with the partner card beside it, title, name, details, bio and up to 3
 * badges. Visitors never see empty slots; the owner sees ghost outlines where things can go.
 */
export function TrainerCard({
  player,
  owner = false,
  children,
  className,
}: {
  player: TrainerCardData
  /** The signed-in player is looking at their own card. */
  owner?: boolean
  /** Below the identity: the lifetime record and actions. */
  children?: ReactNode
  className?: string
}) {
  return (
    <header
      className={cn('relative isolate overflow-hidden rounded-2xl border border-line bg-surface', className)}
      data-slot="trainer-card"
    >
      <div className="h-24 overflow-hidden border-b border-line sm:h-[120px]">
        <PlaymatBanner
          banner={player.banner}
          colour={bannerHex(player.banner, player.bannerColour, player.sleeveColour)}
          style={{ height: '100%', width: 'auto' }}
        />
      </div>
      <div aria-hidden className="slab top-[96px] right-[-10%] hidden w-[20%] animate-slab sm:top-[120px] sm:block" />
      <div className="relative flex flex-col gap-6 px-5 pb-6 sm:px-10 sm:pb-10 sm:pr-[22%]">
        <div className="-mt-14 flex items-end gap-3 sm:-mt-16">
          <Avatar
            avatar={player.avatar}
            size={128}
            label={`${player.name}’s avatar`}
            className="size-28! ring-4 ring-surface sm:size-32! [&_svg]:size-full"
          />
          {player.partner ? (
            <PartnerCard partner={player.partner} className="mb-1" />
          ) : owner ? (
            <Ghost label="Partner Pokémon" className="mb-1 aspect-[63/88] w-14 rotate-[8deg] rounded-[6%] sm:w-16" />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          {player.title ? (
            <TitleChip title={player.title} />
          ) : owner ? (
            <Ghost label="Title" className="h-5 w-20 rounded-full" />
          ) : null}
          <h1 className="font-display text-4xl break-words sm:text-5xl">{player.name}</h1>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-paper-dim">
            {player.username ? <span>@{player.username}</span> : null}
            {player.playerId ? <span className="tabular">Play! ID {player.playerId}</span> : null}
            {player.joinedAt ? (
              <span>
                Since <LocalTime value={player.joinedAt} options={{ month: 'long', year: 'numeric' }} />
              </span>
            ) : null}
          </p>
          {player.bio ? <p className="max-w-xl text-paper-dim">{player.bio}</p> : null}
          {player.badges.length > 0 || owner ? (
            <ul className="mt-1 flex gap-3" aria-label="Badges">
              {player.badges.map((b) => (
                <li key={b.achievement} title={badgeName(b.achievement, b.tier)}>
                  <AchievementBadge achievement={b.achievement} tier={b.tier} size={44} />
                </li>
              ))}
              {owner
                ? Array.from({ length: 3 - player.badges.length }, (_, i) => (
                    <li key={`ghost-${i}`}>
                      <Ghost label="Badge" className="block size-11 rounded-full" />
                    </li>
                  ))
                : null}
            </ul>
          ) : null}
        </div>
        {children}
      </div>
    </header>
  )
}

/** The owner's one call to action on their own card. */
export function CustomiseLink({ className }: { className?: string }) {
  return (
    <Link
      to="/customise"
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-md bg-orange px-3 text-sm font-semibold text-on-orange transition-colors hover:bg-orange-hot',
        className,
      )}
    >
      Customise
    </Link>
  )
}
