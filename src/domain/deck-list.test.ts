import { describe, expect, it } from '@effect/vitest'
import {
  basicEnergyType,
  cardArtKey,
  coverCard,
  featuredPokemon,
  formatDeckList,
  isBasicEnergy,
  parseDeckList,
} from './deck-list.ts'

const DRAGAPULT = `Pokémon: 16
4 Dreepy TWM 128
4 Drakloak TWM 129
3 Dragapult ex TWM 130
2 Duskull PRE 35
1 Dusclops PRE 36
1 Dusknoir PRE 37
1 Fezandipiti ex SFA 38

Trainer: 36
4 Arven SVI 166
4 Lillie's Determination MEG 119
2 Boss's Orders MEG 114
1 Iono PAL 185
4 Buddy-Buddy Poffin TEF 144
4 Ultra Ball SVI 196
4 Rare Candy SVI 191
4 Night Stretcher SFA 61
3 Counter Catcher PAR 160
3 Super Rod PAL 188
3 Area Zero Underdepths SCR 131

Energy: 8
4 Basic {R} Energy SVE 2
4 Basic {P} Energy SVE 5

Total Cards: 60`

describe('parseDeckList', () => {
  it('reads a PTCG Live export into sections', () => {
    const deck = parseDeckList(DRAGAPULT)
    expect(deck.total).toBe(60)
    expect(deck.isLegalSize).toBe(true)
    expect(deck.counts).toEqual({ pokemon: 16, trainer: 36, energy: 8 })
    expect(deck.issues).toEqual([])
    expect(deck.cards[0]).toMatchObject({ count: 4, name: 'Dreepy', setCode: 'TWM', number: '128' })
  })

  it('keeps names with apostrophes, hyphens and suffixes', () => {
    const deck = parseDeckList(DRAGAPULT)
    const names = deck.cards.map((c) => c.name)
    expect(names).toContain("Lillie's Determination")
    expect(names).toContain('Buddy-Buddy Poffin')
    expect(names).toContain('Dragapult ex')
  })

  it('accepts lines without set codes', () => {
    const deck = parseDeckList('2 Pikachu ex\n1 Iono')
    expect(deck.cards.map((c) => [c.name, c.setCode])).toEqual([
      ['Pikachu ex', null],
      ['Iono', null],
    ])
  })

  it('flags a deck that is not 60 cards', () => {
    const deck = parseDeckList('4 Pikachu ex SVP 1')
    expect(deck.isLegalSize).toBe(false)
    expect(deck.issues.map((i) => i.kind)).toContain('wrong-total')
  })

  it('flags more than four copies, except basic energy', () => {
    const deck = parseDeckList('3 Iono PAL 185\n2 Iono PAF 80\n12 Basic {L} Energy SVE 4')
    const kinds = deck.issues.map((i) => i.message)
    expect(kinds.some((m) => m.includes('5 copies of Iono'))).toBe(true)
    expect(kinds.some((m) => m.includes('Energy'))).toBe(false)
  })

  it('reports lines it cannot read with their line number', () => {
    const deck = parseDeckList('4 Arven SVI 166\nthis is not a card')
    expect(deck.issues[0]).toMatchObject({ kind: 'unrecognized-line', line: 2 })
  })

  it('treats an empty paste as empty', () => {
    expect(parseDeckList('   ').issues.map((i) => i.kind)).toEqual(['empty'])
  })

  it('round-trips through formatDeckList', () => {
    const deck = parseDeckList(DRAGAPULT)
    expect(parseDeckList(formatDeckList(deck.cards)).cards).toEqual(deck.cards)
  })

  it.each([
    ['Portuguese', 'Pokémon: 1', 'Treinador: 1', 'Energia: 8', 'Total de cartas: 10'],
    ['Spanish', 'Pokémon: 1', 'Entrenador: 1', 'Energía: 8', 'Total de cartas: 10'],
    ['French', 'Pokémon : 1', 'Dresseur : 1', 'Énergie : 8', 'Cartes totales : 10'],
    ['German', 'Pokémon: 1', 'Trainer: 1', 'Energie: 8', 'Karten insgesamt: 10'],
    ['Italian', 'Pokémon: 1', 'Allenatore: 1', 'Energia: 8', 'Carte totali: 10'],
    ['an unknown language', 'Pokémon: 1', 'Trenér: 1', 'Energie: 8', 'Celkem: 10'],
  ])('reads section headers in %s', (_language, pokemon, trainer, energy, total) => {
    const deck = parseDeckList(
      [pokemon, '1 Dreepy TWM 128', trainer, '1 Arven SVI 166', energy, '8 Energia {P} Básica SVE 5', total].join('\n'),
    )
    expect(deck.issues.filter((i) => i.kind === 'unrecognized-line')).toEqual([])
    expect(deck.counts).toEqual({ pokemon: 1, trainer: 1, energy: 8 })
    expect(deck.issues.some((i) => i.kind === 'too-many-copies')).toBe(false)
  })

  it('reads the older "Energy" set code on basic energy', () => {
    const [card] = parseDeckList('8 Basic Psychic Energy Energy 13').cards
    expect(card).toMatchObject({ name: 'Basic Psychic Energy', setCode: 'Energy', number: '13', section: 'energy' })
  })

  it('picks the most-played Pokémon as the featured card', () => {
    expect(featuredPokemon(parseDeckList(DRAGAPULT).cards)?.name).toBe('Dreepy')
  })
})

describe('isBasicEnergy', () => {
  it.each(['Basic {P} Energy', 'Psychic Energy', 'Basic Fire Energy'])('%s is basic', (name) => {
    expect(isBasicEnergy(name)).toBe(true)
  })
  it.each(['Jet Energy', 'Double Turbo Energy', 'Reversal Energy'])('%s is special', (name) => {
    expect(isBasicEnergy(name)).toBe(false)
  })
  it('knows the type from the symbol, the English name or a basic-energy printing', () => {
    expect(basicEnergyType({ name: 'Basic {R} Energy', setCode: 'SVE', number: '2' })).toBe('R')
    expect(basicEnergyType({ name: 'Energía {W} básica', setCode: null, number: null })).toBe('W')
    expect(basicEnergyType({ name: 'Fairy Energy', setCode: null, number: null })).toBe('Y')
    expect(basicEnergyType({ name: 'Psychic-Energie', setCode: 'MEE', number: '5' })).toBe('P')
    expect(basicEnergyType({ name: 'Metal Energy', setCode: 'SVE', number: '16' })).toBe('M')
    expect(basicEnergyType({ name: 'Jet Energy', setCode: 'PAL', number: '190' })).toBeNull()
  })
})

describe('cardArtKey', () => {
  it('keys printings by set and number', () => {
    expect(cardArtKey({ setCode: 'twm', number: '130' })).toBe('TWM 130')
  })
  it('keys basic energy without a printing by type', () => {
    expect(cardArtKey({ name: 'Psychic Energy', setCode: null, number: null })).toBe('ENERGY {P}')
    expect(cardArtKey({ name: 'Pikachu ex', setCode: null, number: null })).toBeNull()
  })
})

describe('coverCard', () => {
  const { cards } = parseDeckList(DRAGAPULT)

  it('uses the chosen printing, case-insensitive on the set code', () => {
    expect(coverCard(cards, 'TWM 130')?.name).toBe('Dragapult ex')
    expect(coverCard(cards, 'SVI 166')?.name).toBe('Arven')
  })

  it('falls back to the featured Pokémon when nothing is chosen or the card left the list', () => {
    expect(coverCard(cards, null)).toEqual(featuredPokemon(cards))
    expect(coverCard(cards, 'XYZ 1')).toEqual(featuredPokemon(cards))
  })
})
