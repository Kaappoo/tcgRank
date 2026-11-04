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

/** Round robin: game-win % replaces OOMW, and the H2H tag marks a row placed by head-to-head. */
export const RoundRobin: Story = {
  args: {
    tiebreakers: 'round_robin',
    // Misty and Gary both go 2-1; Misty beat Gary, so head-to-head puts her second.
    standings: standings.map((s, i) => ({
      ...s,
      ...(s.playerId === 'gary' ? { wins: 2, losses: 1, draws: 0, points: 6 } : {}),
      headToHead: s.playerId === 'misty',
      gameWinPercentage: 0.7 - i * 0.08,
    })),
  },
}
