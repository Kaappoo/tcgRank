import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { DRAGAPULT_LIST } from '#/stories/fixtures.ts'
import { DeckListView } from './deck-list-view.tsx'

const meta = {
  title: 'Decks/DeckListView',
  component: DeckListView,
  args: { list: DRAGAPULT_LIST },
} satisfies Meta<typeof DeckListView>
export default meta
type Story = StoryObj<typeof meta>

export const List: Story = {}
export const Visual: Story = { args: { defaultMode: 'visual' } }
export const WithIssues: Story = { args: { list: '5 Iono PAL 185\n4 Arven SVI 166\nnot a card line' } }
