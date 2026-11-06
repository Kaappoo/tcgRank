import { Schema } from 'effect'

/**
 * Parser for the Pokémon TCG Live / Limitless export format:
 *
 *   Pokémon: 12
 *   4 Dreepy TWM 128
 *   Trainer: 36
 *   4 Arven SVI 166
 *   Energy: 12
 *   8 Basic Psychic Energy SVE 5
 *   Total Cards: 60
 *
 * PTCG Live exports in the player's language, so the section headers can read
 * "Treinador: 36", "Énergie : 12", "Total de cartas: 60" and so on.
 */

const DeckSection = Schema.Literals(['pokemon', 'trainer', 'energy'])
export type DeckSection = typeof DeckSection.Type

export class DeckCard extends Schema.Class<DeckCard>('tcgrank/DeckCard')({
  count: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 60 })),
  name: Schema.NonEmptyString,
  setCode: Schema.NullOr(Schema.String),
  number: Schema.NullOr(Schema.String),
  section: DeckSection,
}) {}

/** Energy types by their PTCG Live symbol: Grass, fiRe, Water, Lightning, Psychic, Fighting, Darkness, Metal, fairY. */
export type EnergyType = 'G' | 'R' | 'W' | 'L' | 'P' | 'F' | 'D' | 'M' | 'Y'

interface Printing {
  readonly name?: string
  readonly setCode: string | null
  readonly number: string | null
}

const ENERGY_SYMBOL = /\{([GRWLPFDMY])\}/
const ENERGY_WORD = /energy|energ[ií]a|[ée]nergie/i
const ENGLISH_BASIC_ENERGY =
  /^(?:basic\s+)?(grass|fire|water|lightning|psychic|fighting|darkness|metal|fairy)\s+energy$/i
const TYPE_BY_ENGLISH_NAME: Record<string, EnergyType> = {
  grass: 'G',
  fire: 'R',
  water: 'W',
  lightning: 'L',
  psychic: 'P',
  fighting: 'F',
  darkness: 'D',
  metal: 'M',
  fairy: 'Y',
}
/** Sets that only hold basic energy, numbered Grass → Metal and repeating for alternate printings. */
const BASIC_ENERGY_SETS = new Set(['SVE', 'MEE'])
const BASIC_ENERGY_SET_ORDER: ReadonlyArray<EnergyType> = ['G', 'R', 'W', 'L', 'P', 'F', 'D', 'M']

/**
 * The type of a basic energy line, from its "{P}" symbol, its English name, or
 * its printing in a basic-energy set (which also covers names in other languages).
 * Null for special energy and everything else.
 */
export const basicEnergyType = (card: Printing): EnergyType | null => {
  const name = card.name?.trim() ?? ''
  const symbol = ENERGY_SYMBOL.exec(name)?.[1]
  if (symbol && ENERGY_WORD.test(name)) return symbol as EnergyType
  const english = ENGLISH_BASIC_ENERGY.exec(name)?.[1]
  if (english) return TYPE_BY_ENGLISH_NAME[english.toLowerCase()] ?? null
  const set = card.setCode?.toUpperCase()
  const number = Number(card.number)
  if (set && BASIC_ENERGY_SETS.has(set) && Number.isInteger(number) && number >= 1) {
    return BASIC_ENERGY_SET_ORDER[(number - 1) % BASIC_ENERGY_SET_ORDER.length] ?? null
  }
  return null
}

export const isBasicEnergy = (name: string, printing?: Omit<Printing, 'name'>): boolean =>
  basicEnergyType({ name, setCode: printing?.setCode ?? null, number: printing?.number ?? null }) !== null

/**
 * Key of a printing in a deck's stored card art ("TWM 130"). Set codes are
 * case-insensitive in PTCG Live exports. Basic energy listed without a printing
 * ("8 Psychic Energy") gets one key per type ("ENERGY {P}"); other lines without
 * set and number have none.
 */
export const cardArtKey = (card: Printing): string | null => {
  if (card.setCode && card.number) return `${card.setCode.toUpperCase()} ${card.number}`
  const energy = basicEnergyType(card)
  return energy ? `ENERGY {${energy}}` : null
}

const DeckIssueKind = Schema.Literals(['unrecognized-line', 'wrong-total', 'too-many-copies', 'empty'])

class DeckIssue extends Schema.Class<DeckIssue>('tcgrank/DeckIssue')({
  kind: DeckIssueKind,
  message: Schema.String,
  line: Schema.NullOr(Schema.Int),
}) {}

export interface ParsedDeck {
  readonly cards: ReadonlyArray<DeckCard>
  readonly total: number
  readonly counts: Readonly<Record<DeckSection, number>>
  readonly issues: ReadonlyArray<DeckIssue>
  readonly isLegalSize: boolean
}

const DECK_SIZE = 60
const MAX_COPIES = 4

const SECTION_ORDER: ReadonlyArray<DeckSection> = ['pokemon', 'trainer', 'energy']
/** "Pokémon: 12", "Trainer: 36", "Energia: 12", "Cartes totales : 60" — a label, optionally a colon and a count. */
const HEADER_LINE = /^(\p{L}[\p{L}\s.'’-]*?)\s*(:)?\s*(\d+)?\s*$/u
/** Header labels in the languages PTCG Live exports: en, pt, es, fr, de, it. */
const HEADER_LABELS: ReadonlyArray<readonly [DeckSection | 'total', RegExp]> = [
  ['total', /total|gesamt/i],
  ['pokemon', /^pok[eé]mon$/i],
  ['trainer', /^(trainers?|treinador(es)?|entrenador(es)?|dresseurs?|allenator[ei])$/i],
  ['energy', /^(energy|energies|energ[ií]as?|[ée]nergies?)$/i],
]
/** "4 Arven SVI 166", "1 Iono PAL 185", "3 Basic {P} Energy SVE 5", "8 Basic Psychic Energy Energy 13", "2 Pikachu ex" */
const CARD_LINE = /^(\d{1,2})\s+(.+?)(?:\s+([A-Z][A-Z0-9-]{1,5}|Energy)\s+([A-Za-z0-9-]+))?\s*$/

const decodeCard = Schema.decodeUnknownSync(DeckCard)

/**
 * What a header line starts: a section, the closing total, or nothing (not a header).
 * A label in a language we don't know still counts when it has "label: count", and
 * takes the next section in export order (Pokémon, Trainer, Energy, total).
 */
const readHeader = (line: string, headersSeen: number): DeckSection | 'total' | null => {
  const match = HEADER_LINE.exec(line)
  const label = match?.[1]?.trim()
  if (!match || !label) return null
  const known = HEADER_LABELS.find(([, pattern]) => pattern.test(label))?.[0]
  if (known) return known
  if (match[2] && match[3]) return SECTION_ORDER[headersSeen] ?? 'total'
  return null
}

export const parseDeckList = (text: string): ParsedDeck => {
  const cards: Array<DeckCard> = []
  const issues: Array<DeckIssue> = []
  let section: DeckSection = 'pokemon'
  let headersSeen = 0

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim()
    if (line === '' || line.startsWith('#') || line.startsWith('//')) return

    const header = readHeader(line, headersSeen)
    if (header) {
      if (header !== 'total') {
        section = header
        headersSeen = SECTION_ORDER.indexOf(header) + 1
      }
      return
    }

    const match = CARD_LINE.exec(line)
    if (!match?.[1] || !match[2]) {
      issues.push(new DeckIssue({ kind: 'unrecognized-line', message: `Could not read "${line}"`, line: index + 1 }))
      return
    }

    const printing = { name: match[2].trim(), setCode: match[3] ?? null, number: match[4] ?? null }
    cards.push(
      decodeCard({
        count: Number(match[1]),
        ...printing,
        section: basicEnergyType(printing) ? 'energy' : section,
      }),
    )
  })

  const counts: Record<DeckSection, number> = { pokemon: 0, trainer: 0, energy: 0 }
  for (const card of cards) counts[card.section] += card.count
  const total = counts.pokemon + counts.trainer + counts.energy

  if (cards.length === 0) {
    issues.push(new DeckIssue({ kind: 'empty', message: 'Paste a deck list to get started', line: null }))
  } else if (total !== DECK_SIZE) {
    issues.push(
      new DeckIssue({
        kind: 'wrong-total',
        message: `Deck has ${total} cards — tournament decks need exactly ${DECK_SIZE}`,
        line: null,
      }),
    )
  }

  const copiesByName = new Map<string, number>()
  for (const card of cards) {
    if (basicEnergyType(card)) continue
    copiesByName.set(card.name, (copiesByName.get(card.name) ?? 0) + card.count)
  }
  for (const [name, copies] of copiesByName) {
    if (copies > MAX_COPIES) {
      issues.push(
        new DeckIssue({
          kind: 'too-many-copies',
          message: `${copies} copies of ${name} — the limit is ${MAX_COPIES}`,
          line: null,
        }),
      )
    }
  }

  return { cards, total, counts, issues, isLegalSize: total === DECK_SIZE }
}

/** Serialises cards back into the PTCG Live export format. */
export const formatDeckList = (cards: ReadonlyArray<DeckCard>): string => {
  const sections: Array<[DeckSection, string]> = [
    ['pokemon', 'Pokémon'],
    ['trainer', 'Trainer'],
    ['energy', 'Energy'],
  ]
  const out: Array<string> = []
  for (const [key, label] of sections) {
    const inSection = cards.filter((c) => c.section === key)
    if (inSection.length === 0) continue
    out.push(`${label}: ${inSection.reduce((n, c) => n + c.count, 0)}`)
    for (const c of inSection) out.push([c.count, c.name, c.setCode, c.number].filter(Boolean).join(' '))
    out.push('')
  }
  out.push(`Total Cards: ${cards.reduce((n, c) => n + c.count, 0)}`)
  return out.join('\n')
}

/** The headline Pokémon: the most-played Pokémon line, used as the deck's face. */
export const featuredPokemon = (cards: ReadonlyArray<DeckCard>): DeckCard | null =>
  [...cards].filter((c) => c.section === 'pokemon').sort((a, b) => b.count - a.count)[0] ?? null

/**
 * The card on a deck's cover: the printing the owner picked (by `cardArtKey`)
 * while it is still in the list, else the featured Pokémon.
 */
export const coverCard = (cards: ReadonlyArray<DeckCard>, chosen: string | null): DeckCard | null =>
  (chosen ? cards.find((c) => cardArtKey(c) === chosen) : undefined) ?? featuredPokemon(cards)
