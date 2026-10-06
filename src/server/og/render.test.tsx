import { describe, expect, it } from '@effect/vitest'
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
