import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { fn } from 'storybook/test'
import { scoreRules } from '#/domain/best-of.ts'
import { ScoreStepper } from './score-stepper.tsx'

const meta = {
  title: 'Events/ScoreStepper',
  component: ScoreStepper,
  args: { rules: scoreRules(3), sides: { kind: 'mine' }, initial: [2, 1], onSend: fn() },
  decorators: [
    (Story) => (
      <div className="max-w-md rounded-xl border border-line bg-surface p-5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ScoreStepper>
export default meta
type Story = StoryObj<typeof meta>

export const BestOf3: Story = {}
export const BestOf1: Story = { args: { rules: scoreRules(1), initial: [0, 1] } }
export const BestOf5: Story = { args: { rules: scoreRules(5), initial: [3, 2] } }
/** 1–0 on time: sending asks "Send anyway?" first. */
export const Incomplete: Story = { args: { initial: [1, 0] } }
/** The host's correction, labelled with both players. */
export const HostCorrection: Story = {
  args: { sides: { kind: 'players', player1: 'Ash Ketchum', player2: 'Misty Waterflower' }, onCancel: fn() },
}
export const NoTies: Story = { args: { rules: scoreRules(3, { allowEqualGames: false }), initial: [1, 1] } }
