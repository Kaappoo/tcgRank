import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { featuredDeck, playerAchievements, trainerCard } from '#/stories/fixtures.ts'
import { renderWithRouter } from '../../../tests/render.tsx'
import { AchievementsList, tierKey } from './achievements-list.tsx'
import { FeatureDeckGhost, FeaturedDeckCard } from './featured-deck-card.tsx'
import { TrainerCard } from './trainer-card.tsx'

const empty = { ...trainerCard, title: null, partner: null, badges: [], bio: null }

describe('TrainerCard', () => {
  it('shows the banner, avatar, partner, title, name and badges', async () => {
    await renderWithRouter(<TrainerCard player={trainerCard} />)
    expect(screen.getByRole('heading', { name: 'Ash Ketchum' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Ash Ketchum’s avatar' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Partner Pokémon: Pikachu' })).toBeInTheDocument()
    expect(screen.getByText('Champion', { selector: '[data-slot="title-chip"]' })).toBeInTheDocument()
    expect(
      within(screen.getByRole('list', { name: 'Badges' }))
        .getAllByRole('img')
        .map((b) => b.getAttribute('aria-label')),
    ).toEqual(['Champion 1', 'Regular 10', 'Undefeated'])
  })

  it('hides empty slots from visitors and shows the owner ghost outlines', async () => {
    const { container, unmount } = await renderWithRouter(<TrainerCard player={empty} />)
    expect(container.querySelectorAll('[title="Badge"], [title="Partner Pokémon"], [title="Title"]')).toHaveLength(0)
    expect(screen.queryByRole('list', { name: 'Badges' })).not.toBeInTheDocument()
    unmount()
    const owner = await renderWithRouter(<TrainerCard player={empty} owner />)
    expect(owner.container.querySelectorAll('[title="Badge"]')).toHaveLength(3)
    expect(owner.container.querySelectorAll('[title="Partner Pokémon"], [title="Title"]')).toHaveLength(2)
  })
})

describe('FeaturedDeckCard', () => {
  it('shows the deck, its archetype, format and the record with it, and opens the deck page', async () => {
    await renderWithRouter(<FeaturedDeckCard deck={featuredDeck} />)
    const card = screen.getByRole('link', { name: 'Featured deck: Dragapult ex' })
    expect(card).toHaveAttribute('href', '/decks/deck-1')
    expect(card).toHaveTextContent('Dragapult / Dusknoir')
    expect(card).toHaveTextContent('Standard')
    expect(within(card).getByLabelText('12 wins, 5 losses, 1 ties with this deck')).toBeInTheDocument()
  })

  it('offers the owner a ghost to feature one', async () => {
    await renderWithRouter(<FeatureDeckGhost />)
    expect(screen.getByRole('link', { name: 'Feature a deck' })).toHaveAttribute('href', '/customise?slot=deck')
  })
})

describe('AchievementsList', () => {
  it('shows the earned count, progress to the next tier, ??? for unearned secrets and NEW tags', async () => {
    await renderWithRouter(<AchievementsList data={playerAchievements} fresh={new Set([tierKey('champion', 1)])} />)
    expect(screen.getByText(/badges earned/)).toHaveTextContent('6/36 badges earned')
    const rows = screen
      .getAllByRole('listitem')
      .filter((li) => li.parentElement?.getAttribute('aria-label') !== 'Tiers')
    const regular = rows.find((r) => r.textContent?.includes('Regular'))!
    expect(regular).toHaveTextContent('12 / 25 events')
    expect(rows.filter((r) => r.textContent?.includes('???'))).toHaveLength(3)
    const champion = rows.find((r) => r.textContent?.includes('Champion'))!
    expect(within(champion).getByText('NEW')).toBeInTheDocument()
    expect(within(regular).queryByText('NEW')).not.toBeInTheDocument()
  })
})
