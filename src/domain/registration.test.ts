import { describe, expect, it } from '@effect/vitest'
import { deckIneligibility } from './registration.ts'

describe('deckIneligibility', () => {
  it('accepts a 60-card deck in the event format', () => {
    expect(deckIneligibility({ format: 'standard', cardCount: 60 }, 'standard')).toBeNull()
  })

  it('refuses a deck built for another format', () => {
    expect(deckIneligibility({ format: 'expanded', cardCount: 60 }, 'standard')).toBe(
      'Built for Expanded, not Standard',
    )
  })

  it('refuses a deck that is not exactly 60 cards', () => {
    expect(deckIneligibility({ format: 'standard', cardCount: 59 }, 'standard')).toBe('Has 59 cards, not 60')
  })
})
