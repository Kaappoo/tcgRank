import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { myGuestsQuery } from '#/lib/queries.ts'
import { AddGuestForm } from './guests.tsx'

const CLOSED = 'Entries are closed: the schedule has started'

const renderForm = (closedReason: string | null) => {
  const client = new QueryClient()
  client.setQueryData(myGuestsQuery.queryKey, [{ id: 'g1', name: 'Gary', claimCode: 'c', eventCount: 1 }])
  render(
    <QueryClientProvider client={client}>
      <AddGuestForm players={[]} busy={false} onAdd={vi.fn()} closedReason={closedReason} />
    </QueryClientProvider>,
  )
}

describe('AddGuestForm', () => {
  it('adds a new player or a guest from earlier events while entry is open', () => {
    renderForm(null)
    expect(screen.getByRole('textbox', { name: 'Player name' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Gary' })).toBeEnabled()
  })

  it('disables adding a player and a guest once entries are closed, saying why', () => {
    renderForm(CLOSED)
    expect(screen.getByText(CLOSED)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Player name' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Gary' })).toBeDisabled()
  })
})
