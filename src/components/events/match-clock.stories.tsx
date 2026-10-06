import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { MatchClock } from './match-clock.tsx'

const meta = {
  title: 'Events/MatchClock',
  component: MatchClock,
  args: { roundMinutes: 50, endsAt: null, pausedRemainingMs: 31 * 60_000 + 42_000, size: 'lg' },
} satisfies Meta<typeof MatchClock>
export default meta
type Story = StoryObj<typeof meta>

export const Running: Story = {
  render: (args) => <MatchClock {...args} endsAt={Date.now() + 23 * 60_000} pausedRemainingMs={null} />,
}
export const FinalMinutes: Story = {
  render: (args) => <MatchClock {...args} endsAt={Date.now() + 3 * 60_000} pausedRemainingMs={null} />,
}
export const Paused: Story = {}
export const Overtime: Story = {
  render: (args) => <MatchClock {...args} endsAt={Date.now() - 45_000} pausedRemainingMs={null} />,
}
export const StoreScreen: Story = { args: { size: 'xl' } }
