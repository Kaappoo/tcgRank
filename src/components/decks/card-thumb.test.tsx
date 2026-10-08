import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DeckCard } from '#/domain/deck-list.ts'
import { CardThumb } from './card-thumb.tsx'

const dragapult = new DeckCard({ count: 3, name: 'Dragapult ex', setCode: 'TWM', number: '130', section: 'pokemon' })

describe('CardThumb', () => {
  it('shows the stored card art with its copy count', () => {
    render(<CardThumb card={dragapult} image="https://assets.test/sv06/130/low.webp" />)
    expect(screen.getByRole('img', { name: 'Dragapult ex' })).toHaveAttribute(
      'src',
      'https://assets.test/sv06/130/low.webp',
    )
    expect(screen.getByText(/3 copies of/)).toBeInTheDocument()
  })

  it('falls back to the card name and printing when there is no art', () => {
    render(<CardThumb card={dragapult} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getAllByText('Dragapult ex').length).toBeGreaterThan(0)
    expect(screen.getByText('TWM 130')).toBeInTheDocument()
  })

  it('falls back to the placeholder when the image fails to load', () => {
    render(<CardThumb card={dragapult} image="https://assets.test/missing.webp" />)
    fireEvent.error(screen.getByRole('img', { name: 'Dragapult ex' }))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('TWM 130')).toBeInTheDocument()
  })
})
