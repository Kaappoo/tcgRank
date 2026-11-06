import { QueryClient } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Toaster } from '#/components/ui/toast.tsx'
import { defaultAvatar } from '#/domain/avatar-parts.ts'
import type { Unlock, Unseen } from '#/server/identity/achievements.ts'
import { renderWithRouter } from '../../../tests/render.tsx'
import { CelebrationHost, isStoreScreen } from './celebration-host.tsx'
import { celebrationScreens } from './celebration-screens.ts'
import { UnlockCelebration } from './unlock-celebration.tsx'

const fns = vi.hoisted(() => ({
  getUnseenUnlocks: vi.fn(),
  getAchievements: vi.fn(),
  getStyleEditor: vi.fn(),
  savePlayerStyle: vi.fn(),
  showTitle: vi.fn(),
  wearTrophyItem: vi.fn(),
}))
const unseenFn = fns.getUnseenUnlocks
vi.mock('#/server/functions/identity.ts', () => fns)

const champion: Unlock = {
  achievement: 'champion',
  tier: 1,
  earnedAt: 3,
  title: 'champion',
  trophies: ['champion-cap', 'champion-slab'],
  backfilled: false,
}
const regular: Unlock = { achievement: 'regular', tier: 1, earnedAt: 3, title: null, trophies: [], backfilled: false }
const winner: Unlock = {
  achievement: 'match-winner',
  tier: 1,
  earnedAt: 3,
  title: null,
  trophies: [],
  backfilled: false,
}
const past = (u: Unlock): Unlock => ({ ...u, backfilled: true })
const avatar = defaultAvatar('usr_ash')

describe('celebrationScreens', () => {
  it('puts trophy items first, then one badge per screen with its title on it', () => {
    expect(celebrationScreens([champion, regular])).toEqual([
      { kind: 'trophy', item: 'champion-cap' },
      { kind: 'trophy', item: 'champion-slab' },
      { kind: 'badge', achievement: 'champion', tier: 1, title: 'champion' },
      { kind: 'badge', achievement: 'regular', tier: 1, title: null },
    ])
  })

  it('turns the launch backfill into two screens: the count, then the trophy items', () => {
    expect(celebrationScreens([champion, regular, winner].map(past))).toEqual([
      { kind: 'count', count: 3 },
      { kind: 'trophies', items: ['champion-cap', 'champion-slab'] },
    ])
    expect(celebrationScreens([past(regular)])).toHaveLength(1)
  })

  it('still gives an unlock earned since the launch its own screens after the welcome', () => {
    expect(celebrationScreens([champion, past(regular), past(winner)])).toEqual([
      { kind: 'count', count: 2 },
      { kind: 'trophy', item: 'champion-cap' },
      { kind: 'trophy', item: 'champion-slab' },
      { kind: 'badge', achievement: 'champion', tier: 1, title: 'champion' },
    ])
  })
})

describe('UnlockCelebration', () => {
  const screens = celebrationScreens([champion, regular])
  const props = { screens, avatar, onClose: vi.fn(), onWear: vi.fn(), onShowTitle: vi.fn() }
  beforeEach(() => vi.clearAllMocks())

  it('shows one unlock per screen, best first; a tap anywhere moves on and the last one closes', async () => {
    render(<UnlockCelebration {...props} />)
    expect(screen.getByRole('dialog', { name: 'Trophy item: Champion cap' })).toBeInTheDocument()
    for (const name of ['Trophy item: Champion slab', 'Badge: Champion, title Champion', 'Badge: Regular']) {
      await userEvent.click(screen.getByRole('dialog'))
      expect(screen.getByRole('dialog', { name })).toBeInTheDocument()
    }
    await userEvent.click(screen.getByRole('dialog'))
    expect(props.onClose).toHaveBeenCalledOnce()
  })

  it('Skip closes the whole run', async () => {
    render(<UnlockCelebration {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(props.onClose).toHaveBeenCalledOnce()
  })

  it('Wear it puts the item on without moving to the next screen', async () => {
    render(<UnlockCelebration {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Wear it' }))
    expect(props.onWear).toHaveBeenCalledWith('champion-cap')
    expect(screen.getByRole('button', { name: 'Wearing it' })).toBeDisabled()
    expect(screen.getByRole('dialog', { name: 'Trophy item: Champion cap' })).toBeInTheDocument()
  })

  it('Show it shows a new title', async () => {
    render(<UnlockCelebration {...props} screens={screens.slice(2)} />)
    await userEvent.click(screen.getByRole('button', { name: 'Show it' }))
    expect(props.onShowTitle).toHaveBeenCalledWith('champion')
  })

  it('only fades with reduced motion', () => {
    render(<UnlockCelebration {...props} reducedMotion />)
    expect(screen.getByRole('dialog')).toHaveAttribute('data-motion', 'reduced')
  })
})

describe('CelebrationHost', () => {
  beforeEach(() => window.localStorage.clear())

  const host = async (unseen: Unseen) => {
    unseenFn.mockResolvedValue(unseen)
    await renderWithRouter(
      <Toaster>
        <CelebrationHost userId="usr_ash" avatar={avatar} />
      </Toaster>,
      new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    )
  }

  it('plays new unlocks once', async () => {
    await host({ unlocks: [regular], busy: false, welcome: false })
    expect(await screen.findByRole('dialog', { name: 'Badge: Regular' })).toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem('tcgrank-celebrated:usr_ash')!)).toEqual(['regular:1'])
  })

  it('Wear it saves straight away, and Undo puts the old look back', async () => {
    const before = { ...avatar, hat: 'beanie' }
    fns.getStyleEditor.mockResolvedValue({
      style: {
        avatar: before,
        sleeveColour: 'teal',
        banner: 'card-zones',
        bannerColour: null,
        title: null,
        showcase: [],
        featuredDeckId: null,
        partner: null,
      },
    })
    fns.wearTrophyItem.mockResolvedValue({})
    fns.savePlayerStyle.mockResolvedValue({})
    await host({ unlocks: [champion], busy: false, welcome: false })
    await userEvent.click(await screen.findByRole('button', { name: 'Wear it' }))
    expect(fns.wearTrophyItem).toHaveBeenCalledWith({ data: { item: 'champion-cap' } })
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }))
    await vi.waitFor(() => expect(fns.savePlayerStyle).toHaveBeenCalled())
    expect(fns.savePlayerStyle.mock.calls[0]![0].data.avatar.hat).toBe('beanie')
  })

  it('stays quiet while the player is busy', async () => {
    await host({ unlocks: [regular], busy: true, welcome: false })
    await vi.waitFor(() => expect(unseenFn).toHaveBeenCalled())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('never mounts on the store screen', () => {
    expect(isStoreScreen('/events/abc/screen')).toBe(true)
    expect(isStoreScreen('/events/abc')).toBe(false)
  })
})
