import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { Badge, LiveDot } from './badge.tsx'

const meta = { title: 'UI/Badge', component: Badge } satisfies Meta<typeof Badge>
export default meta
type Story = StoryObj<typeof meta>

export const States: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="live">
        <LiveDot /> Round 2 live
      </Badge>
      <Badge variant="outline">Standard</Badge>
      <Badge>You&apos;re hosting</Badge>
      <Badge variant="win">W</Badge>
      <Badge variant="draw">T</Badge>
      <Badge variant="loss">L</Badge>
      <Badge variant="muted">Dropped</Badge>
    </div>
  ),
}
