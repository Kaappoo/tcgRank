import { useState, type ReactNode } from 'react'
import { Button } from '#/components/ui/button.tsx'
import { achievement, titleName, type TitleId } from '#/domain/achievements.ts'
import { trophyItem, type Avatar as AvatarValue, type TrophyItemId } from '#/domain/avatar-parts.ts'
import { cn } from '#/lib/utils.ts'
import { AchievementBadge, badgeName } from './achievement-badge.tsx'
import { AvatarArt } from './avatar-art.tsx'
import { screenLabel, type CelebrationScreen } from './celebration-screens.ts'
import { PlaymatBanner } from './playmat-banner.tsx'
import { TitleChip } from './title-chip.tsx'

const GOLD_BANNER = '#E2B33C'

/** The trophy item as it looks on: worn by the player's avatar, or the banner itself. */
function TrophyArt({ item, avatar, size }: { item: TrophyItemId; avatar: AvatarValue; size: number }) {
  const { slot } = trophyItem(item)
  if (slot === 'banner') {
    return (
      <span className="block overflow-hidden rounded-lg" style={{ width: size * 1.6, height: size * 0.8 }}>
        <PlaymatBanner banner={item} colour={GOLD_BANNER} width={400} height={size * 0.8} />
      </span>
    )
  }
  return <AvatarArt avatar={{ ...avatar, [slot]: item }} size={size} clipId={`celebrate-${item}`} />
}

/**
 * The unlock celebration: full screen, one unlock per screen. The slab wipes in and the unlock stamps onto it; with
 * reduced motion both only fade. Tap anywhere for the next screen; Skip closes the whole run.
 */
export function UnlockCelebration({
  screens,
  avatar,
  reducedMotion = false,
  onClose,
  onWear,
  onShowTitle,
}: {
  screens: ReadonlyArray<CelebrationScreen>
  /** The player's current look, to show trophy items on. */
  avatar: AvatarValue
  reducedMotion?: boolean
  onClose: () => void
  onWear: (item: TrophyItemId) => void
  onShowTitle: (title: TitleId) => void
}) {
  const [step, setStep] = useState(0)
  const [worn, setWorn] = useState<ReadonlySet<TrophyItemId>>(new Set())
  const [shown, setShown] = useState<TitleId | null>(null)
  const screen = screens[step]
  if (!screen) return null
  const last = step === screens.length - 1
  const next = () => (last ? onClose() : setStep((s) => s + 1))

  const wear = (item: TrophyItemId) => {
    setWorn((w) => new Set([...w, item]))
    onWear(item)
  }
  const wearButton = (item: TrophyItemId, primary: boolean) => (
    <Button
      size={primary ? 'lg' : 'sm'}
      variant={primary ? 'default' : 'outline'}
      disabled={worn.has(item)}
      onClick={(e) => {
        e.stopPropagation()
        wear(item)
      }}
    >
      {worn.has(item) ? 'Wearing it' : 'Wear it'}
    </Button>
  )

  const slab = (children: ReactNode) => (
    <div className="relative grid h-44 w-full max-w-xs place-items-center">
      <span aria-hidden className="celebrate-slab absolute inset-y-2 inset-x-6 -skew-x-12 rounded-md bg-orange" />
      <span className="celebrate-stamp relative">{children}</span>
    </div>
  )

  let body: ReactNode
  let action: ReactNode = null
  switch (screen.kind) {
    case 'count':
      body = (
        <>
          <p className="text-sm font-semibold text-paper-dim">Welcome to achievements</p>
          {slab(<span className="font-numerals text-8xl leading-none text-on-orange">{screen.count}</span>)}
          <h2 className="font-display text-3xl text-balance">{screen.count} badges from your past events</h2>
          <p className="text-paper-dim">Your league nights count. See them all in Achievements on your profile.</p>
        </>
      )
      break
    case 'trophies':
      body = (
        <>
          <h2 className="font-display text-3xl">Your trophy items</h2>
          <ul className="flex w-full max-w-sm flex-col gap-2 text-left">
            {screen.items.map((item) => (
              <li
                key={item}
                className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 rounded-xl border border-line bg-surface-raised p-2"
              >
                <TrophyArt item={item} avatar={avatar} size={52} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{trophyItem(item).name}</span>
                  <span className="block truncate text-xs text-paper-dim">
                    {badgeName(trophyItem(item).earnedAt.achievement, trophyItem(item).earnedAt.tier)}
                  </span>
                </span>
                {wearButton(item, false)}
              </li>
            ))}
          </ul>
        </>
      )
      break
    case 'trophy': {
      const item = trophyItem(screen.item)
      body = (
        <>
          <p className="text-sm font-semibold text-paper-dim">Trophy item</p>
          {slab(<TrophyArt item={screen.item} avatar={avatar} size={140} />)}
          <h2 className="font-display text-3xl">{item.name}</h2>
          <p className="text-paper-dim">Earned at {badgeName(item.earnedAt.achievement, item.earnedAt.tier)}</p>
        </>
      )
      action = wearButton(screen.item, true)
      break
    }
    case 'badge':
      body = (
        <>
          <p className="text-sm font-semibold text-paper-dim">Badge</p>
          {slab(<AchievementBadge achievement={screen.achievement} tier={screen.tier} size={140} />)}
          <h2 className="font-display text-3xl">{badgeName(screen.achievement, screen.tier)}</h2>
          <p className="text-paper-dim">{achievement(screen.achievement).description}</p>
          {screen.title ? (
            <p className="flex items-center gap-2 text-sm text-paper-dim">
              New title <TitleChip title={screen.title} />
            </p>
          ) : null}
        </>
      )
      if (screen.title) {
        const title = screen.title
        action = (
          <Button
            size="lg"
            disabled={shown === title}
            onClick={(e) => {
              e.stopPropagation()
              setShown(title)
              onShowTitle(title)
            }}
          >
            {shown === title ? `Showing ${titleName(title)}` : 'Show it'}
          </Button>
        )
      }
      break
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={screenLabel(screen)}
      data-motion={reducedMotion ? 'reduced' : 'full'}
      className="fixed inset-0 z-[80] flex cursor-pointer flex-col bg-ink px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      onClick={next}
    >
      <div className="flex items-center justify-between">
        <span className="tabular text-sm text-paper-dim">
          {step + 1} / {screens.length}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          Skip
        </Button>
      </div>
      <div
        key={step}
        className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 text-center"
      >
        {body}
      </div>
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3">
        {action}
        <div className="flex gap-1.5" aria-hidden>
          {screens.map((_, i) => (
            <i key={i} className={cn('block h-1 w-5 rounded-full bg-line', i <= step && 'bg-orange')} />
          ))}
        </div>
        <span className="text-sm text-paper-dim">
          {last ? 'Tap anywhere to close' : 'Tap anywhere for the next one'}
        </span>
      </div>
    </div>
  )
}
