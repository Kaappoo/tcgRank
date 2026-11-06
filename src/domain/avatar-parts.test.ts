import { describe, expect, it } from 'vitest'
import {
  AVATAR_PARTS,
  AVATAR_SLOTS,
  BANNERS,
  CLOTHING_COLOURS,
  defaultAvatar,
  defaultStyle,
  hatCoversHead,
  resolveAvatar,
  TROPHY_ITEMS,
  type AvatarParts,
} from './avatar-parts.ts'

const ids = ['usr_kaua', 'usr_mika', 'abc123', 'guest-1', 'z', '0123456789abcdef']

describe('the parts list', () => {
  it('has the launch counts', () => {
    expect(AVATAR_PARTS.skin).toHaveLength(7)
    expect(AVATAR_PARTS.hair.map((p) => p.id)).toEqual(['bald', 'short', 'spiky', 'long', 'curly', 'ponytail', 'buzz'])
    expect(AVATAR_PARTS.hairColour).toHaveLength(8)
    expect(AVATAR_PARTS.facialHair.map((p) => p.id)).toEqual(['none', 'stubble', 'moustache', 'beard'])
    expect(AVATAR_PARTS.face.map((p) => p.id)).toEqual(['smile', 'grin', 'focused'])
    expect(AVATAR_PARTS.hat.filter((p) => !p.trophy).map((p) => p.id)).toEqual([
      'none',
      'trainer-cap',
      'backwards-cap',
      'beanie',
      'visor',
      'bucket-hat',
      'headband',
    ])
    expect(AVATAR_PARTS.accessory.filter((p) => !p.trophy).map((p) => p.id)).toEqual([
      'none',
      'glasses',
      'plaster',
      'backpack',
    ])
    expect(CLOTHING_COLOURS).toHaveLength(8)
    expect(BANNERS.map((b) => b.id)).toEqual([
      'card-zones',
      'prize-grid',
      'damage-counters',
      'slabs',
      'led-board',
      'champion-slab',
    ])
  })

  it('marks five trophy items with the tier that earns them', () => {
    expect(TROPHY_ITEMS.map((t) => [t.id, t.earnedAt.achievement, t.earnedAt.tier])).toEqual([
      ['champion-cap', 'champion', 1],
      ['champion-slab', 'champion', 1],
      ['topcut-jacket', 'top-cut', 1],
      ['top8-visor', 'top-cut', 2],
      ['league-pin', 'regular', 3],
    ])
  })

  it('knows which hats cover the head', () => {
    expect(hatCoversHead('trainer-cap')).toBe(true)
    expect(hatCoversHead('beanie')).toBe(true)
    expect(hatCoversHead('visor')).toBe(false)
    expect(hatCoversHead('headband')).toBe(false)
    expect(hatCoversHead('none')).toBe(false)
  })
})

describe('defaultAvatar', () => {
  it('gives the same avatar for the same user id', () => {
    for (const id of ids) expect(defaultAvatar(id)).toEqual(defaultAvatar(id))
  })

  it('differs between users', () => {
    const looks = new Set(ids.map((id) => JSON.stringify(defaultAvatar(id))))
    expect(looks.size).toBe(ids.length)
  })

  it('uses free parts only', () => {
    for (let i = 0; i < 300; i++) {
      const avatar = defaultAvatar(`user-${i}`)
      for (const slot of AVATAR_SLOTS) {
        const part = AVATAR_PARTS[slot].find((p) => p.id === avatar[slot])
        expect(part, `${slot} ${avatar[slot]}`).toBeDefined()
        expect(part!.trophy).toBeUndefined()
      }
    }
  })

  it('does not change when a part is appended to a list', () => {
    const extended: AvatarParts = {
      ...AVATAR_PARTS,
      hair: [...AVATAR_PARTS.hair, { id: 'mohawk', name: 'Mohawk' }],
      hat: [...AVATAR_PARTS.hat, { id: 'top-hat', name: 'Top hat' }],
      topColour: [...AVATAR_PARTS.topColour, { id: 'orange', name: 'Orange', hex: '#F06A2A' }],
    }
    for (let i = 0; i < 100; i++) expect(defaultAvatar(`user-${i}`, extended)).toEqual(defaultAvatar(`user-${i}`))
  })

  it('also picks a sleeve colour from the clothing colours', () => {
    const { sleeveColour } = defaultStyle('usr_kaua')
    expect(CLOTHING_COLOURS.map((c) => c.id)).toContain(sleeveColour)
    expect(defaultStyle('usr_kaua').avatar).toEqual(defaultAvatar('usr_kaua'))
  })
})

describe('resolveAvatar', () => {
  it('keeps known ids and falls back to the default part for unknown or missing ones', () => {
    const fallback = defaultAvatar('usr_kaua')
    const stored = { ...fallback, hair: 'spiky', hat: 'retired-hat', face: 42 }
    delete (stored as Partial<typeof stored>).skin
    const resolved = resolveAvatar(stored, 'usr_kaua')
    expect(resolved.hair).toBe('spiky')
    expect(resolved.hat).toBe(fallback.hat)
    expect(resolved.face).toBe(fallback.face)
    expect(resolved.skin).toBe(fallback.skin)
  })

  it('reads garbage as the default avatar', () => {
    expect(resolveAvatar('nope', 'usr_mika')).toEqual(defaultAvatar('usr_mika'))
    expect(resolveAvatar(null, 'usr_mika')).toEqual(defaultAvatar('usr_mika'))
  })
})
