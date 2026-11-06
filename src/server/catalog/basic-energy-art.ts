import type { EnergyType } from '#/domain/deck-list.ts'

/**
 * Art for basic energy, by type. TCGdex — and so the Poké Cards catalog — has
 * no images for the basic-energy sets PTCG Live exports (SVE, MEE), so those
 * lines would never get art. Crown Zenith's basic energy (Sun & Moon's for
 * Fairy) is the same design and is in TCGdex.
 */
export const BASIC_ENERGY_ART: Readonly<Record<EnergyType, string>> = {
  G: 'https://assets.tcgdex.net/en/swsh/swsh12.5/152/low.webp',
  R: 'https://assets.tcgdex.net/en/swsh/swsh12.5/153/low.webp',
  W: 'https://assets.tcgdex.net/en/swsh/swsh12.5/154/low.webp',
  L: 'https://assets.tcgdex.net/en/swsh/swsh12.5/155/low.webp',
  P: 'https://assets.tcgdex.net/en/swsh/swsh12.5/156/low.webp',
  F: 'https://assets.tcgdex.net/en/swsh/swsh12.5/157/low.webp',
  D: 'https://assets.tcgdex.net/en/swsh/swsh12.5/158/low.webp',
  M: 'https://assets.tcgdex.net/en/swsh/swsh12.5/159/low.webp',
  Y: 'https://assets.tcgdex.net/en/sm/sm1/172/low.webp',
}
