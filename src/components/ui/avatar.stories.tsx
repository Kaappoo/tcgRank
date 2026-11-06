import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { defaultAvatar } from '#/domain/avatar-parts.ts'
import { Avatar } from './avatar.tsx'

const meta = {
  title: 'UI/Avatar',
  component: Avatar,
  args: { avatar: defaultAvatar('usr_kaua'), size: 128, label: 'Avatar' },
} satisfies Meta<typeof Avatar>
export default meta
type Story = StoryObj<typeof meta>

export const Profile: Story = {}
export const EverySize: Story = {
  render: (args) => (
    <div className="flex items-end gap-4">
      {[128, 56, 40, 32, 30, 24].map((size) => (
        <Avatar key={size} {...args} size={size} />
      ))}
    </div>
  ),
}
export const CoveringHatOverSpikyHair: Story = {
  args: { avatar: { ...defaultAvatar('usr_kaua'), hair: 'spiky', hat: 'trainer-cap' } },
}
export const Defaults: Story = {
  render: () => (
    <div className="grid grid-cols-8 gap-3">
      {Array.from({ length: 24 }, (_, i) => (
        <Avatar key={i} avatar={defaultAvatar(`usr_${i}`)} size={56} />
      ))}
    </div>
  ),
}
