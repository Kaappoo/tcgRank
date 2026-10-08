import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { DeckView } from '#/server/decks/service.ts'
import { renderWithRouter } from '../../../tests/render.tsx'
import { DeckPicker, SKIP_DECK } from './deck-picker.tsx'

const deck = (overrides: Partial<DeckView>): DeckView => ({
  id: 'deck-1',
  name: 'Dragapult ex',
  format: 'standard',
  archetype: null,
  list: '4 Dreepy TWM 128',
  cardCount: 60,
  coverImageUrl: null,
  cardImages: {},
  isPublic: true,
  updatedAt: 0,
  owner: { id: 'u1', name: 'Ash', username: 'ash' },
  ...overrides,
})

const decks = [deck({}), deck({ id: 'deck-2', name: 'Gardevoir ex', format: 'expanded' })]

describe('DeckPicker', () => {
  it('offers a skip and every deck when the event does not require one', async () => {
    const onChange = vi.fn()
    await renderWithRouter(
      <DeckPicker decks={decks} eventFormat="standard" required={false} value={null} onChange={onChange} joinCode="ABC234" />,
    )
    expect(screen.getByRole('radio', { name: /Gardevoir ex/ })).toBeEnabled()
    await userEvent.click(screen.getByRole('radio', { name: /Skip/ }))
    expect(onChange).toHaveBeenCalledWith(SKIP_DECK)
    expect(screen.getByRole('link', { name: /New deck/ })).toHaveAttribute('href', '/decks/new?joinCode=ABC234')
  })

  it('hides the skip and disables ineligible decks when a deck is required', async () => {
    const onChange = vi.fn()
    await renderWithRouter(
      <DeckPicker decks={decks} eventFormat="standard" required value={null} onChange={onChange} joinCode="ABC234" />,
    )
    expect(screen.queryByRole('radio', { name: /Skip/ })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Gardevoir ex/ })).toBeDisabled()
    expect(screen.getByText('Built for Expanded, not Standard')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: /Dragapult ex/ }))
    expect(onChange).toHaveBeenCalledWith('deck-1')
  })
})
