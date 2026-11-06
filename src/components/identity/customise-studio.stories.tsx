import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { defaultAvatar } from '#/domain/avatar-parts.ts'
import { CustomiseStudio } from './customise-studio.tsx'

const meta = {
  title: 'Identity/CustomiseStudio',
  component: CustomiseStudio,
  args: {
    userId: 'usr_story',
    name: 'Kauã Andrade',
    onDone: () => {},
    editor: {
      style: {
        avatar: defaultAvatar('usr_story'),
        sleeveColour: 'teal',
        title: 'champion',
        banner: 'card-zones',
        bannerColour: null,
        showcase: ['champion'],
        featuredDeckId: null,
        partner: null,
      },
      defaultAvatar: defaultAvatar('usr_story'),
      earned: {
        trophies: ['champion-cap', 'champion-slab'],
        titles: ['champion'],
        badges: { champion: 1, regular: 2 },
      },
      seenAt: 0,
      newTrophies: ['champion-cap', 'champion-slab'],
      newTitles: ['champion'],
      decks: [
        { id: 'd1', name: 'Dragapult ex', archetype: 'Dragapult / Dusknoir', format: 'standard', isPublic: true },
        { id: 'd2', name: 'Secret brew', archetype: null, format: 'standard', isPublic: false },
      ],
    },
  },
} satisfies Meta<typeof CustomiseStudio>
export default meta
type Story = StoryObj<typeof meta>

export const Look: Story = {}
export const Hats: Story = { args: { initialSlot: 'hat' } }
export const Banner: Story = { args: { initialSlot: 'banner' } }
export const Titles: Story = { args: { initialSlot: 'title' } }
export const FeaturedDeck: Story = { args: { initialSlot: 'deck' } }
