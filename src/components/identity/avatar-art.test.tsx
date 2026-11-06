import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { defaultAvatar } from '#/domain/avatar-parts.ts'
import { AvatarArt } from './avatar-art.tsx'

const look = { ...defaultAvatar('ash'), hair: 'spiky' }
const hairClipped = (container: HTMLElement) => container.querySelector('g[clip-path$="-hair)"]')

describe('AvatarArt', () => {
  it('clips the hair above the brim under a hat that covers the head', () => {
    const { container } = render(<AvatarArt avatar={{ ...look, hat: 'trainer-cap' }} size={64} />)
    expect(container.querySelector('clipPath[id$="-hair"]')).not.toBeNull()
    expect(hairClipped(container)).not.toBeNull()
  })

  it('lets the hair show through a visor or headband', () => {
    for (const hat of ['visor', 'headband', 'none']) {
      const { container, unmount } = render(<AvatarArt avatar={{ ...look, hat }} size={64} />)
      expect(hairClipped(container)).toBeNull()
      unmount()
    }
  })

  it('draws the same crop at any size', () => {
    const { container } = render(<AvatarArt avatar={look} size={24} label="Ash’s avatar" />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('viewBox')).toBe('0 0 200 200')
    expect(svg.getAttribute('width')).toBe('24')
    expect(svg).toHaveAttribute('aria-label', 'Ash’s avatar')
  })
})
