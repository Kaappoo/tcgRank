import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DeckCard } from '#/domain/deck-list.ts'
import { renderWithQuery } from '../../../tests/render.tsx'
import { CardThumb } from './card-thumb.tsx'

describe('CardThumb', () => {
  it('shows the card art once the API answers', async () => {
    renderWithQuery(
      <CardThumb card={new DeckCard({ count: 3, name: 'Dragapult ex', setCode: 'TWM', number: '130', section: 'pokemon' })} />,
    )
    const img = await screen.findByRole('img', { name: 'Dragapult ex' })
    expect(img).toHaveAttribute('src', 'https://images.test/sv6-130.png')
    expect(screen.getByText(/3 copies of/)).toBeInTheDocument()
  })

  it('falls back to the card name when there is no set code', () => {
    renderWithQuery(<CardThumb card={new DeckCard({ count: 1, name: 'Iono', setCode: null, number: null, section: 'trainer' })} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getAllByText('Iono').length).toBeGreaterThan(0)
  })
})
