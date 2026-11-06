import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { playingMatch } from '#/stories/fixtures.ts'
import { StorePairings } from './store-pairings.tsx'

const meta = {
  title: 'Events/StorePairings',
  component: StorePairings,
  args: { matches: [playingMatch, { ...playingMatch, id: 'm2', table: 8, status: 'confirmed' }] },
} satisfies Meta<typeof StorePairings>
export default meta
type Story = StoryObj<typeof meta>

export const Round: Story = {}
