import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { ArrowRight, QrCode } from 'lucide-react'
import { Button } from './button.tsx'

const meta = {
  title: 'UI/Button',
  component: Button,
  args: { children: 'Pair round 2' },
} satisfies Meta<typeof Button>
export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {}
export const Outline: Story = {
  args: {
    variant: 'outline',
    children: (
      <>
        <QrCode /> Join with a code
      </>
    ),
  },
}
export const Ghost: Story = { args: { variant: 'ghost', children: 'Cancel' } }
export const Destructive: Story = { args: { variant: 'destructive', children: 'Delete deck' } }
export const Disabled: Story = { args: { disabled: true } }
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Small</Button>
      <Button>Default</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">
        Host an event <ArrowRight />
      </Button>
    </div>
  ),
}
