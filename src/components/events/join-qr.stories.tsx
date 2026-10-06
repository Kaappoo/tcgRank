import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { JoinQrCard } from './join-qr.tsx'

const meta = {
  title: 'Events/JoinQrCard',
  component: JoinQrCard,
  args: { code: 'K7Q2XM', eventName: 'Tuesday League Challenge', origin: 'https://tcgrank.app' },
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof JoinQrCard>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
