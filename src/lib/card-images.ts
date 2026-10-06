import { queryOptions } from '@tanstack/react-query'

export const POKEMON_TCG_API = 'https://api.pokemontcg.io/v2'

export interface CardImage {
  readonly id: string
  readonly name: string
  readonly small: string
  readonly large: string
}

interface ApiResponse {
  data: Array<{ id: string; name: string; images: { small: string; large: string } }>
}

/**
 * Looks a card up by its PTCG Live set code and collector number
 * (e.g. "TWM 130") using the public Pokémon TCG API.
 */
export async function fetchCardImage(setCode: string, number: string, signal?: AbortSignal): Promise<CardImage | null> {
  const params = new URLSearchParams({
    q: `set.ptcgoCode:${setCode} number:${number}`,
    select: 'id,name,images',
    pageSize: '1',
  })
  const response = await fetch(`${POKEMON_TCG_API}/cards?${params}`, { signal })
  if (!response.ok) return null
  const body = (await response.json()) as ApiResponse
  const card = body.data[0]
  return card ? { id: card.id, name: card.name, small: card.images.small, large: card.images.large } : null
}

export const cardImageQuery = (setCode: string | null, number: string | null) =>
  queryOptions({
    queryKey: ['card-image', setCode, number],
    queryFn: ({ signal }) => (setCode && number ? fetchCardImage(setCode, number, signal) : null),
    enabled: Boolean(setCode && number),
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
    meta: { persist: true },
  })
