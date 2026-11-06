import { QueryClient } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultAvatar } from '#/domain/avatar-parts.ts'
import type { Unlock, Unseen } from '#/server/identity/achievements.ts'
import { renderWithRouter } from '../../../tests/render.tsx'
import { CelebrationHost, isStoreScreen } from './celebration-host.tsx'
import { celebrationScreens } from './celebration-screens.ts'
import { UnlockCelebration } from './unlock-celebration.tsx'

const unseenFn = vi.hoisted(() => vi.fn())
vi.mock('#/server/functions/identity.ts', () => ({
  getUnseenUnlocks: unseenFn,
  getAchievements: vi.fn(),
  getStyleEditor: vi.fn(),
  savePlayerStyle: vi.fn(),
  showTitle: vi.fn(),
  wearTrophyItem: vi.fn(),
}))

const champion: Unlock = {
  achievement: 'champion',
  tier: 1,
  earnedAt: 3,
  title: 'champion',
  trophies: ['champion-cap', 'champion-slab'],
}
const regular: Unlock = { achievement: 'regular', tier: 1, earnedAt: 3, title: null, trophies: [] }
const winner: Unlock = { achievement: 'match-winner', tier: 1, earnedAt: 3, title: null, trophies: [] }
const avatar = defaultAvatar('usr_ash')

describe('celebrationScreens', () => {
  it('puts trophy items first, then one badge per screen with its title on it', () => {
    expect(celebrationScreens({ unlocks: [champion, regular], welcome: false })).toEqual([
      { kind: 'trophy', item: 'champion-cap' },
      { kind: 'trophy', item: 'champion-slab' },
      { kind: 'badge', achievement: 'champion', tier: 1, title: 'champion' },
      { kind: 'badge', achievement: 'regular', tier: 1, title: null },
    ])
  })

  it('turns the launch backfill into two screens: the count, then the trophy items', () => {
    expect(celebrationScreens({ unlocks: [champion, regular, winner], welcome: true })).toEqual([
      { kind: 'count', count: 3 },
      { kind: 'trophies', items: ['champion-cap', 'champion-slab'] },
    ])
    expect(celebrationScreens({ unlocks: [regular], welcome: true })).toHaveLength(1)
  })
})

describe('UnlockCelebration', () => {
  const screens = celebrationScreens({ unlocks: [champion, regular], welcome: false })
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
      <CelebrationHost userId="usr_ash" avatar={avatar} />,
      new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    )
  }

  it('plays new unlocks once', async () => {
    await host({ unlocks: [regular], busy: false, welcome: false })
    expect(await screen.findByRole('dialog', { name: 'Badge: Regular' })).toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem('tcgrank-celebrated:usr_ash')!)).toEqual(['regular:1'])
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
