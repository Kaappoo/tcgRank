import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { defaultAvatar } from '#/domain/avatar-parts.ts'
import { celebrationScreens } from './celebration-screens.ts'
import { UnlockCelebration } from './unlock-celebration.tsx'

const champion = {
  achievement: 'champion',
  tier: 1,
  earnedAt: 0,
  title: 'champion',
  trophies: ['champion-cap', 'champion-slab'],
} as const
const regular = { achievement: 'regular', tier: 2, earnedAt: 0, title: null, trophies: [] } as const

const meta = {
  title: 'Identity/UnlockCelebration',
  component: UnlockCelebration,
  args: {
    screens: celebrationScreens({ unlocks: [champion, regular], welcome: false }),
    avatar: defaultAvatar('usr_kaua'),
    onClose: () => {},
    onWear: () => {},
    onShowTitle: () => {},
  },
} satisfies Meta<typeof UnlockCelebration>
export default meta
type Story = StoryObj<typeof meta>

export const EventFinished: Story = {}
export const LaunchWelcome: Story = {
  args: { screens: celebrationScreens({ unlocks: [champion, regular, { ...regular, tier: 1 }], welcome: true }) },
}
export const ReducedMotion: Story = { args: { reducedMotion: true } }
