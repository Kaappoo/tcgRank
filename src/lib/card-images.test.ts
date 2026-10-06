import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../../tests/msw/server.ts'
import { fetchCardImage, POKEMON_TCG_API } from './card-images.ts'

describe('fetchCardImage', () => {
  it('looks a card up by PTCG Live set code and number', async () => {
    const card = await fetchCardImage('TWM', '130')
    expect(card).toEqual({
      id: 'sv6-130',
      name: 'Dragapult ex',
      small: 'https://images.test/sv6-130.png',
      large: 'https://images.test/sv6-130_hires.png',
    })
  })

  it('returns null for unknown cards', async () => {
    expect(await fetchCardImage('XXX', '1')).toBeNull()
  })

  it('returns null when the API is down instead of throwing', async () => {
    server.use(http.get(`${POKEMON_TCG_API}/cards`, () => new HttpResponse(null, { status: 503 })))
    expect(await fetchCardImage('TWM', '130')).toBeNull()
  })
})
