import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { playingMatch } from '#/stories/fixtures.ts'
import { PairingCard } from './pairing-card.tsx'

const meta = {
  title: 'Events/PairingCard',
  component: PairingCard,
  args: {
    match: playingMatch,
    viewerId: 'ash',
    bestOf: 3,
    records: new Map([
      ['ash', { wins: 2, losses: 0, draws: 0, byes: 0 }],
      ['misty', { wins: 1, losses: 0, draws: 1, byes: 0 }],
    ]),
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PairingCard>
export default meta
type Story = StoryObj<typeof meta>

export const Paired: Story = {}
export const BestOfOne: Story = { args: { bestOf: 1 } }
export const Bye: Story = { args: { match: { ...playingMatch, player2: null, outcome: 'bye', status: 'confirmed' } } }
export const LongNames: Story = {
  args: {
    match: {
      ...playingMatch,
      player2: { id: 'misty', name: 'Maria Eduarda Albuquerque dos Santos', username: null, image: null },
    },
  },
}
