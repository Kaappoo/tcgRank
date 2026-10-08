import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithQuery } from '../../../tests/render.tsx'
import { DeckListView } from './deck-list-view.tsx'

const LIST = 'Pokémon: 3\n3 Dragapult ex TWM 130\nTrainer: 4\n4 Arven SVI 166'
const ART = { 'TWM 130': 'https://assets.test/sv06/130/low.webp' }

describe('card zoom', () => {
  it('enlarges a clicked card with its large art and steps through the deck', async () => {
    renderWithQuery(<DeckListView list={LIST} cardImages={ART} defaultMode="visual" />)
    await userEvent.click(screen.getByRole('button', { name: 'Enlarge Dragapult ex' }))

    const dialog = screen.getByRole('dialog', { name: 'Dragapult ex' })
    expect(dialog).toHaveTextContent('3 copies · TWM 130 · 1/2')
    expect(within(dialog).getByRole('img', { name: 'Dragapult ex' })).toHaveAttribute(
      'src',
      'https://assets.test/sv06/130/high.webp',
    )

    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('dialog', { name: 'Arven' })).toHaveTextContent('4 copies · SVI 166 · 2/2')
    await userEvent.click(screen.getByRole('button', { name: 'Next card' }))
    expect(screen.getByRole('dialog', { name: 'Dragapult ex' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens from a card name in list view', async () => {
    renderWithQuery(<DeckListView list={LIST} cardImages={ART} />)
    await userEvent.click(screen.getByRole('button', { name: 'Arven' }))
    expect(screen.getByRole('dialog', { name: 'Arven' })).toBeInTheDocument()
  })
})
