import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { bracketDetail } from '#/stories/fixtures.ts'
import { BracketPath } from './bracket-path.tsx'

/** The Pairings tab of the prototype's bracket: 7 players, seed 1 with a bye, semifinals in play. */
const meta = {
  title: 'Events/BracketPath',
  component: BracketPath,
  args: { detail: bracketDetail, viewerId: 'diego' },
  decorators: [
    (Story) => (
      <div className="max-w-[390px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BracketPath>
export default meta
type Story = StoryObj<typeof meta>

export const InTheSemifinal: Story = {}
export const HadABye: Story = { args: { viewerId: 'ana' } }
export const KnockedOut: Story = { args: { viewerId: 'carla' } }
export const NotInTheBracket: Story = { args: { viewerId: null } }
export const Host: Story = { args: { viewerId: 'host', canEdit: true } }
