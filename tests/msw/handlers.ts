import { http, HttpResponse } from 'msw'
import { POKEMON_TCG_API } from '#/lib/card-images.ts'

/** Minimal fake of the Pokémon TCG API: only the cards our fixtures reference. */
export const cards: Record<string, { id: string; name: string }> = {
  'TWM 130': { id: 'sv6-130', name: 'Dragapult ex' },
  'SVI 166': { id: 'sv1-166', name: 'Arven' },
}

export const handlers = [
  http.get(`${POKEMON_TCG_API}/cards`, ({ request }) => {
    const q = new URL(request.url).searchParams.get('q') ?? ''
    const match = /set\.ptcgoCode:(\S+) number:(\S+)/.exec(q)
    const card = match ? cards[`${match[1]} ${match[2]}`] : undefined
    return HttpResponse.json({
      data: card
        ? [
            {
              ...card,
              images: {
                small: `https://images.test/${card.id}.png`,
                large: `https://images.test/${card.id}_hires.png`,
              },
            },
          ]
        : [],
    })
  }),
]
