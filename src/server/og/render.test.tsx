import { describe, expect, it } from '@effect/vitest'
import { eventCard } from './event-card.ts'
import { OgFrame, OgStat, OG_HEIGHT, OG_WIDTH, renderOgImage } from './render.tsx'

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47]

describe('renderOgImage', () => {
  it('renders a 1200×630 PNG share card', async () => {
    const png = await renderOgImage(
      <OgFrame footer={<span>Pallet Town Games</span>}>
        <div style={{ display: 'flex', fontSize: 80 }}>Tuesday League Challenge</div>
        <div style={{ display: 'flex' }}>
          <OgStat value="16" label="PLAYERS" />
          <OgStat value="K7Q2XM" label="JOIN CODE" />
        </div>
      </OgFrame>,
    )
    expect([...png.subarray(0, 4)]).toEqual(PNG_SIGNATURE)
    // IHDR width/height live at bytes 16–23.
    expect(png.readUInt32BE(16)).toBe(OG_WIDTH)
    expect(png.readUInt32BE(20)).toBe(OG_HEIGHT)
  })
})

describe('eventCard', () => {
  const event = {
    status: 'running',
    currentRound: 1,
    format: 'standard',
    pairingSystem: 'swiss',
    plannedRounds: 5,
  } as const
  const standing = (rank: number, name: string) => ({ rank, player: { name } })

  it.each([
    ['registration', { ...event, status: 'registration', currentRound: 0 }, 'Registration open · Standard'],
    ['a live Swiss round', { ...event, currentRound: 3 }, 'Round 3 live · Standard'],
    [
      'a live semifinal',
      { ...event, pairingSystem: 'single_elimination', plannedRounds: 3, currentRound: 2 },
      'Semifinal live · Standard',
    ],
    [
      'a live final',
      { ...event, pairingSystem: 'single_elimination', plannedRounds: 3, currentRound: 3 },
      'Final live · Standard',
    ],
    [
      'an early round of a bracket larger than 8',
      { ...event, pairingSystem: 'single_elimination', plannedRounds: 4, currentRound: 1 },
      'Round 1 live · Standard',
    ],
    ['a finished event', { ...event, status: 'finished', currentRound: 5 }, 'Final standings · Standard'],
  ] as const)('the pill reads the state of %s', (_, e, pill) => {
    expect(eventCard({ event: e, standings: [] }).pill).toBe(pill)
  })

  it('names the player placed 1st as champion once the event is finished', () => {
    const standings = [standing(2, 'Gary Oak'), standing(1, 'Ash Ketchum'), standing(3, 'Misty')]
    const finished = { ...event, status: 'finished', currentRound: 5 } as const
    expect(eventCard({ event: finished, standings }).champion).toBe('Ash')
    expect(eventCard({ event, standings }).champion).toBeNull()
  })
})
