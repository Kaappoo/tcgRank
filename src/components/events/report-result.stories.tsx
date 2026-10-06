import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { fn } from 'storybook/test'
import { playingMatch } from '#/stories/fixtures.ts'
import { ReportResult } from './report-result.tsx'

const meta = {
  title: 'Events/ReportResult',
  component: ReportResult,
  args: { match: playingMatch, viewerId: 'ash', onReport: fn(), onConfirm: fn() },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ReportResult>
export default meta
type Story = StoryObj<typeof meta>

export const Reporting: Story = {}
export const NeedsYourConfirmation: Story = {
  args: {
    match: {
      ...playingMatch,
      player1Games: 1,
      player2Games: 2,
      outcome: 'p2',
      reportedById: 'misty',
      status: 'reported',
    },
  },
}
export const WaitingForOpponent: Story = {
  args: {
    match: {
      ...playingMatch,
      player1Games: 2,
      player2Games: 0,
      outcome: 'p1',
      reportedById: 'ash',
      status: 'reported',
    },
  },
}
export const Confirmed: Story = {
  args: { match: { ...playingMatch, player1Games: 2, player2Games: 1, outcome: 'p1', status: 'confirmed' } },
}
