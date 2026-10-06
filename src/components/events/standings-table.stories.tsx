import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { standings } from '#/stories/fixtures.ts'
import { StandingsTable } from './standings-table.tsx'

const meta = {
  title: 'Events/StandingsTable',
  component: StandingsTable,
  args: { standings, highlightId: 'misty' },
} satisfies Meta<typeof StandingsTable>
export default meta
type Story = StoryObj<typeof meta>

export const Live: Story = {}
export const Final: Story = { args: { final: true, highlightId: null } }
