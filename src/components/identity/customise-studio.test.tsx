import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Toaster } from '#/components/ui/toast.tsx'
import { defaultAvatar } from '#/domain/avatar-parts.ts'
import { useSaveStyle } from '#/hooks/use-save-style.ts'
import { styleDraftStore } from '#/lib/style-draft.ts'
import type { StyleEditor } from '#/server/identity/player-style.ts'
import { CustomiseStudio } from './customise-studio.tsx'

const search = vi.hoisted(() => vi.fn())
const save = vi.hoisted(() => vi.fn())
vi.mock('#/server/functions/identity.ts', () => ({ searchPartnerCards: search, savePlayerStyle: save }))

const USER = 'usr_ash'
const defaults = defaultAvatar(USER)

const editor: StyleEditor = {
  style: {
    avatar: { ...defaults, hair: defaults.hair === 'spiky' ? 'curly' : 'spiky' },
    sleeveColour: 'teal',
    title: null,
    banner: 'card-zones',
    bannerColour: null,
    showcase: [],
    featuredDeckId: null,
    partner: null,
  },
  defaultAvatar: defaults,
  earned: { trophies: [], titles: [], badges: {} },
  seenAt: 0,
  newTrophies: [],
  newTitles: [],
  decks: [
    { id: 'd1', name: 'Dragapult ex', archetype: 'Dragapult', format: 'standard', isPublic: true },
    { id: 'd2', name: 'Secret brew', archetype: null, format: 'standard', isPublic: false },
  ],
}

function Studio({ onDone }: { onDone?: () => void }) {
  const saveStyle = useSaveStyle(USER)
  return (
    <CustomiseStudio
      editor={editor}
      userId={USER}
      name="Ash"
      onDone={(draft) => saveStyle.mutate(draft, { onSuccess: onDone })}
    />
  )
}

const renderStudio = (onDone?: () => void) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Toaster>
        <Studio onDone={onDone} />
      </Toaster>
    </QueryClientProvider>,
  )

const openSlot = async (name: string) =>
  userEvent.click(within(screen.getByRole('navigation', { name: 'Slots' })).getByRole('button', { name }))
const draftHair = () => styleDraftStore.load(USER)?.draft.avatar.hair

beforeEach(() => {
  window.localStorage.clear()
  search.mockReset()
  save.mockReset()
})
afterEach(() => vi.restoreAllMocks())

describe('CustomiseStudio', () => {
  it('shows trophy items as silhouettes and says what earns one', async () => {
    renderStudio()
    await openSlot('Hat')
    const cap = screen.getByRole('button', { name: 'Champion cap (locked)' })
    expect(cap).toHaveTextContent('???')
    await userEvent.click(cap)
    expect(await screen.findByText('Champion cap is a trophy item')).toBeInTheDocument()
    expect(screen.getByText(/Reach Champion 1/)).toBeInTheDocument()
  })

  it('starts every part slot with the player’s own default part', async () => {
    renderStudio()
    await openSlot('Hair')
    const fallback = screen.getByRole('button', { name: 'Default' })
    expect(fallback).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(fallback)
    expect(fallback).toHaveAttribute('aria-pressed', 'true')
    expect(draftHair()).toBe(defaults.hair)
  })

  it('resets the whole avatar with Reset all, and Undo brings it back', async () => {
    renderStudio()
    await openSlot('Sleeve colour')
    await userEvent.click(screen.getByRole('button', { name: 'Sleeve colour: Red' }))
    await userEvent.click(screen.getByRole('button', { name: /Reset all/ }))
    expect(draftHair()).toBe(defaults.hair)
    expect(styleDraftStore.load(USER)?.draft.sleeveColour).toBe('red')
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }))
    expect(draftHair()).toBe(editor.style.avatar.hair)
  })

  it('greys out private decks in the Featured deck slot', async () => {
    renderStudio()
    await openSlot('Featured deck')
    expect(screen.getByRole('button', { name: /Secret brew/ })).toBeDisabled()
    expect(screen.getByText('Make it public to feature it')).toBeInTheDocument()
  })

  it('offline, Done closes and keeps the draft on the phone to sync later', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const onDone = vi.fn()
    renderStudio(onDone)
    await openSlot('Hair')
    await userEvent.click(screen.getByRole('button', { name: 'Default' }))
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(onDone.mock.calls[0]?.[0]).toBe('queued'))
    expect(save).not.toHaveBeenCalled()
    expect(styleDraftStore.load(USER)).toMatchObject({ pending: true, draft: { avatar: { hair: defaults.hair } } })
  })

  it('online, Done saves and clears the draft', async () => {
    save.mockResolvedValue({})
    const onDone = vi.fn()
    renderStudio(onDone)
    await openSlot('Hair')
    await userEvent.click(screen.getByRole('button', { name: 'Default' }))
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(onDone.mock.calls[0]?.[0]).toBe('saved'))
    expect(save.mock.calls[0]![0].data.avatar.hair).toBe(defaults.hair)
    expect(styleDraftStore.load(USER)).toBeNull()
  })
})

describe('the partner picker', () => {
  it('tells "no results" apart from an unreachable catalog', async () => {
    search.mockResolvedValueOnce({ cards: [], total: 0, nextPage: null })
    renderStudio()
    await openSlot('Partner Pokémon')
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search Pokémon cards' }), 'zzz')
    expect(await screen.findByText('No Pokémon called “zzz”.')).toBeInTheDocument()

    search.mockRejectedValueOnce(new Error('Couldn’t reach the card catalog.'))
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search Pokémon cards' }), 'z')
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t reach the card catalog')
  })
})
