import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { defaultAvatar } from '#/domain/avatar-parts.ts'
import { AvatarArt, headBand } from './avatar-art.tsx'

const look = { ...defaultAvatar('ash'), hair: 'spiky' }
const hairClipped = (container: HTMLElement) => container.querySelector('g[clip-path$="-hair)"]')

describe('AvatarArt', () => {
  it('clips the hair above the brim under a hat that covers the head', () => {
    const { container } = render(<AvatarArt avatar={{ ...look, hat: 'trainer-cap' }} size={64} />)
    expect(container.querySelector('clipPath[id$="-hair"]')).not.toBeNull()
    expect(hairClipped(container)).not.toBeNull()
  })

  it('clips the hair under every new covering hat', () => {
    for (const hat of ['beret', 'flat-cap', 'cowboy-hat', 'bandana', 'top-hat']) {
      const { container, unmount } = render(<AvatarArt avatar={{ ...look, hat }} size={64} />)
      expect(hairClipped(container), hat).not.toBeNull()
      unmount()
    }
  })

  it('ends a head band on the head’s outline, not past it', () => {
    // Hat space puts the head's centre at (100, 103); the band follows a circle of r=47 around it.
    const numbers = headBand(74, 88)
      .match(/-?\d+(\.\d+)?/g)!
      .map(Number)
    const [x1, y1, x2] = numbers
    const [bx, by] = [numbers[8], numbers[9]]
    expect(y1).toBe(74)
    expect(by).toBe(88)
    expect(Math.hypot(x1! - 100, y1! - 103)).toBeCloseTo(47, 0)
    expect(Math.hypot(x2! - 100, y1! - 103)).toBeCloseTo(47, 0)
    expect(Math.hypot(bx! - 100, by! - 103)).toBeCloseTo(47, 0)
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
