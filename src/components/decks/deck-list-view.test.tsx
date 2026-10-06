import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithQuery } from '../../../tests/render.tsx'
import { DeckListView } from './deck-list-view.tsx'

const LIST = 'Pokémon: 3\n3 Dragapult ex TWM 130\nTrainer: 4\n4 Arven SVI 166'

describe('DeckListView', () => {
  it('groups cards by section and warns about illegal size', () => {
    renderWithQuery(<DeckListView list={LIST} />)
    expect(screen.getByRole('region', { name: 'Pokémon' })).toHaveTextContent('Dragapult ex')
    expect(screen.getByRole('region', { name: 'Trainer' })).toHaveTextContent('Arven')
    expect(screen.getByText(/Deck has 7 cards/)).toBeInTheDocument()
  })

  it('switches to the visual grid and loads card art', async () => {
    renderWithQuery(<DeckListView list={LIST} />)
    await userEvent.click(screen.getByRole('button', { name: 'visual' }))
    expect(await screen.findByRole('img', { name: 'Arven' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'visual' })).toHaveAttribute('aria-pressed', 'true')
  })
})
