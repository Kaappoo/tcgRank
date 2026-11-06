import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { toast } from '#/components/ui/toast.tsx'
import { titleName, type TitleId } from '#/domain/achievements.ts'
import { trophyItem, type Avatar as AvatarValue, type TrophyItemId } from '#/domain/avatar-parts.ts'
import { styleEditorQuery, unseenUnlocksQuery } from '#/lib/queries.ts'
import { toInput } from '#/lib/style-draft.ts'
import { savePlayerStyle, showTitle, wearTrophyItem } from '#/server/functions/identity.ts'
import type { Unlock } from '#/server/identity/achievements.ts'
import { draftFrom } from './customise-studio.tsx'
import { celebrationScreens } from './celebration-screens.ts'
import { tierKey } from './achievements-list.tsx'
import { UnlockCelebration } from './unlock-celebration.tsx'

/** Unlocks this phone has already celebrated, so a dismissed run never plays twice. */
const celebrated = {
  key: (userId: string) => `tcgrank-celebrated:${userId}`,
  load(userId: string): ReadonlySet<string> {
    try {
      return new Set(JSON.parse(window.localStorage.getItem(this.key(userId)) ?? '[]') as Array<string>)
    } catch {
      return new Set()
    }
  },
  add(userId: string, unlocks: ReadonlyArray<Unlock>) {
    try {
      const keys = new Set([...this.load(userId), ...unlocks.map((u) => tierKey(u.achievement, u.tier))])
      window.localStorage.setItem(this.key(userId), JSON.stringify([...keys]))
    } catch {
      // Storage blocked: the run may play again next time.
    }
  },
}

const reducedMotionQuery = '(prefers-reduced-motion: reduce)'
const motionMedia = () => (typeof window.matchMedia === 'function' ? window.matchMedia(reducedMotionQuery) : null)
const subscribeMotion = (onChange: () => void) => {
  const media = motionMedia()
  media?.addEventListener('change', onChange)
  return () => media?.removeEventListener('change', onChange)
}
const usePrefersReducedMotion = () =>
  useSyncExternalStore(
    subscribeMotion,
    () => motionMedia()?.matches ?? false,
    () => false,
  )

/** Is this a store-screen route? The celebration never mounts on the shared TV display. */
export const isStoreScreen = (pathname: string) => /^\/events\/[^/]+\/screen\/?$/.test(pathname)

/**
 * Plays the unlock celebration once for new unlocks: on app open, on navigation, and when an event the player is in
 * finishes (the event query reports it, ADR 0002). Waits while the player is busy, and never on the store screen.
 */
export function CelebrationHost({ userId, avatar }: { userId: string; avatar: AvatarValue }) {
  const queryClient = useQueryClient()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const onStoreScreen = isStoreScreen(pathname)
  const { data: unseen } = useQuery({ ...unseenUnlocksQuery, enabled: !onStoreScreen })
  const reducedMotion = usePrefersReducedMotion()
  const [run, setRun] = useState<ReadonlyArray<Unlock> | null>(null)

  // Navigation re-reads the unseen unlocks.
  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: unseenUnlocksQuery.queryKey })
  }, [pathname, queryClient])

  // An event the player follows finishing re-reads them too, so the celebration lands over the final standings.
  useEffect(() => {
    const finished = new Set<string>()
    return queryClient.getQueryCache().subscribe((e) => {
      if (e.type !== 'updated' || e.query.queryKey[0] !== 'event') return
      const data = e.query.state.data as { event?: { id: string; status: string } } | undefined
      if (data?.event?.status !== 'finished' || finished.has(data.event.id)) return
      finished.add(data.event.id)
      void queryClient.invalidateQueries({ queryKey: unseenUnlocksQuery.queryKey })
    })
  }, [queryClient])

  useEffect(() => {
    if (run || !unseen || unseen.busy || onStoreScreen) return
    const seen = celebrated.load(userId)
    const fresh = unseen.unlocks.filter((u) => !seen.has(tierKey(u.achievement, u.tier)))
    if (fresh.length === 0) return
    celebrated.add(userId, unseen.unlocks)
    setRun(unseen.welcome ? unseen.unlocks : fresh)
  }, [unseen, run, userId, onStoreScreen])

  const wear = useServerFn(wearTrophyItem)
  const show = useServerFn(showTitle)
  const save = useServerFn(savePlayerStyle)
  const refresh = () =>
    Promise.all(
      [['profile'], ['session'], ['style'], ['event']].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    )

  const screens = useMemo(
    () => (run && unseen ? celebrationScreens({ unlocks: run, welcome: unseen.welcome }) : []),
    [run, unseen],
  )
  if (!run || screens.length === 0 || onStoreScreen) return null

  return (
    <UnlockCelebration
      screens={screens}
      avatar={avatar}
      reducedMotion={reducedMotion}
      onClose={() => setRun(null)}
      onWear={(item: TrophyItemId) => {
        void (async () => {
          const before = await queryClient.fetchQuery(styleEditorQuery).catch(() => null)
          try {
            await wear({ data: { item } })
            await refresh()
            toast.undo(`Wearing the ${trophyItem(item).name}`, () => {
              if (before) void save({ data: toInput(draftFrom(before)) }).then(refresh)
            })
          } catch (error) {
            toast.error('Couldn’t put it on', error instanceof Error ? error.message : undefined)
          }
        })()
      }}
      onShowTitle={(title: TitleId) => {
        void (async () => {
          const before = await queryClient.fetchQuery(styleEditorQuery).catch(() => null)
          try {
            await show({ data: { title } })
            await refresh()
            toast.undo(`Showing ${titleName(title)}`, () => {
              void show({ data: { title: before?.style.title ?? null } }).then(refresh)
            })
          } catch (error) {
            toast.error('Couldn’t show it', error instanceof Error ? error.message : undefined)
          }
        })()
      }}
    />
  )
}
