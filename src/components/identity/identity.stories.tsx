import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { ACHIEVEMENTS } from '#/domain/achievements.ts'
import { BANNERS } from '#/domain/avatar-parts.ts'
import { featuredDeck, playerAchievements, trainerCard } from '#/stories/fixtures.ts'
import { AchievementBadge } from './achievement-badge.tsx'
import { AchievementsList, tierKey } from './achievements-list.tsx'
import { FeatureDeckGhost, FeaturedDeckCard } from './featured-deck-card.tsx'
import { PlaymatBanner, bannerHex } from './playmat-banner.tsx'
import { TrainerCard } from './trainer-card.tsx'

const meta = {
  title: 'Identity/TrainerCard',
  component: TrainerCard,
  args: { player: trainerCard },
} satisfies Meta<typeof TrainerCard>
export default meta
type Story = StoryObj<typeof meta>

export const Full: Story = {}
export const NewPlayerAsVisitor: Story = {
  args: {
    player: {
      ...trainerCard,
      title: null,
      partner: null,
      badges: [],
      bio: null,
      banner: 'card-zones',
      bannerColour: null,
    },
  },
}
export const NewPlayerAsOwner: Story = { args: { ...NewPlayerAsVisitor.args, owner: true } }

export const Badges: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {ACHIEVEMENTS.map((a) => (
        <div key={a.id} className="flex items-center gap-3">
          <span className="w-28 text-sm text-paper-dim">{a.name}</span>
          {a.tiers.map((_, i) => (
            <AchievementBadge key={i} achievement={a.id} tier={i + 1} size={44} />
          ))}
        </div>
      ))}
    </div>
  ),
}

export const Banners: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {BANNERS.map((b) => (
        <div key={b.id} className="h-[120px] overflow-hidden rounded-lg">
          <PlaymatBanner
            banner={b.id}
            colour={bannerHex(b.id, null, 'teal')}
            style={{ height: '100%', width: 'auto' }}
          />
        </div>
      ))}
    </div>
  ),
}

export const FeaturedDeck: Story = {
  render: () => (
    <div className="flex max-w-xl flex-col gap-4">
      <FeaturedDeckCard deck={featuredDeck} />
      <FeatureDeckGhost />
    </div>
  ),
}

export const AchievementsTab: Story = {
  render: () => <AchievementsList data={playerAchievements} fresh={new Set([tierKey('champion', 1)])} />,
}
