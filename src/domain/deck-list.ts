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

const SECTION_HEADER = /^(pok[eé]mon|trainers?|energy)\s*:?\s*(\d+)?\s*$/i
const TOTAL_LINE = /^total\s+cards\s*:?\s*\d+\s*$/i
/** "4 Arven SVI 166", "1 Iono PAL 185", "3 Basic {P} Energy SVE 5", "2 Pikachu ex" */
const CARD_LINE = /^(\d{1,2})\s+(.+?)(?:\s+([A-Z][A-Z0-9-]{1,5})\s+([A-Za-z0-9-]+))?\s*$/
const BASIC_ENERGY =
  /^(basic\s+)?(\{[GRWLPFDMY]\}|grass|fire|water|lightning|psychic|fighting|darkness|metal|fairy)\s+energy$/i

const decodeCard = Schema.decodeUnknownSync(DeckCard)

const sectionFromHeader = (header: string): DeckSection => {
  const lower = header.toLowerCase()
  if (lower.startsWith('trainer')) return 'trainer'
  if (lower.startsWith('energy')) return 'energy'
  return 'pokemon'
}

export const isBasicEnergy = (name: string): boolean => BASIC_ENERGY.test(name.trim())

export const parseDeckList = (text: string): ParsedDeck => {
  const cards: Array<DeckCard> = []
  const issues: Array<DeckIssue> = []
  let section: DeckSection = 'pokemon'

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim()
    if (line === '' || TOTAL_LINE.test(line) || line.startsWith('#') || line.startsWith('//')) return

    const header = SECTION_HEADER.exec(line)
    if (header?.[1]) {
      section = sectionFromHeader(header[1])
      return
    }

    const match = CARD_LINE.exec(line)
    if (!match?.[1] || !match[2]) {
      issues.push(new DeckIssue({ kind: 'unrecognized-line', message: `Could not read "${line}"`, line: index + 1 }))
      return
    }

    const name = match[2].trim()
    cards.push(
      decodeCard({
        count: Number(match[1]),
        name,
        setCode: match[3] ?? null,
        number: match[4] ?? null,
        section: isBasicEnergy(name) ? 'energy' : section,
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
    if (isBasicEnergy(card.name)) continue
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
