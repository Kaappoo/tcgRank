import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { bracketDetail } from '#/stories/fixtures.ts'
import { BracketScreen } from './bracket-screen.tsx'
import { QrCode } from './join-qr.tsx'
import { MatchClock } from './match-clock.tsx'

/** The store screen of the prototype's bracket: 7 players, seed 1 with a bye, semifinals in play. */
const meta = {
  title: 'Events/BracketScreen',
  component: BracketScreen,
  parameters: { layout: 'fullscreen' },
  args: {
    detail: bracketDetail,
    clock: <MatchClock endsAt={null} pausedRemainingMs={23 * 60_000} roundMinutes={50} size="lg" />,
    qr: <QrCode value="https://tcgrank.app/events/cup" label="Scan to follow the bracket" className="size-full" />,
  },
} satisfies Meta<typeof BracketScreen>
export default meta
type Story = StoryObj<typeof meta>

export const SemifinalsInPlay: Story = {}
