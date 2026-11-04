import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { EventSetupFields, type SetupDraft } from './event-setup-fields.tsx'

const DEFAULT_SETUP_DRAFT: SetupDraft = { pairingSystem: 'swiss', topCut: false, plannedRounds: 0 }

let latest: SetupDraft = DEFAULT_SETUP_DRAFT

function Harness() {
  const [draft, setDraft] = useState(DEFAULT_SETUP_DRAFT)
  latest = draft
  return <EventSetupFields value={draft} onChange={setDraft} />
}

describe('Host an event: event setup fields', () => {
  it('starts as Swiss without a top cut, with the round count field', () => {
    render(<Harness />)
    expect(screen.getByRole('button', { name: 'Swiss' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('switch', { name: 'Top cut' })).not.toBeChecked()
    expect(screen.getByRole('spinbutton', { name: 'Swiss rounds' })).toHaveValue(0)
    expect(screen.getByText(/3 rounds for 8 players, 4 for 16/)).toBeInTheDocument()
  })

  it('follows the League Cup table in the hint once the top cut is on', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('switch', { name: 'Top cut' }))
    expect(latest.topCut).toBe(true)
    expect(screen.getByText(/3 rounds for 8 players, 5 for 16/)).toBeInTheDocument()
  })

  it('takes a round count the host types', async () => {
    render(<Harness />)
    const field = screen.getByRole('spinbutton', { name: 'Swiss rounds' })
    await userEvent.clear(field)
    await userEvent.type(field, '4')
    expect(latest.plannedRounds).toBe(4)
  })

  it.each([
    ['Round robin', 'Everyone plays everyone: N−1 rounds'],
    ['Single elimination', 'Rounds follow the bracket size'],
  ])('%s hides the top cut and the round count, with the rule as a hint', async (system, hint) => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('switch', { name: 'Top cut' }))
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Swiss rounds' }), '5')
    await userEvent.click(screen.getByRole('button', { name: system }))
    expect(screen.queryByRole('switch', { name: 'Top cut' })).not.toBeInTheDocument()
    expect(screen.queryByRole('spinbutton', { name: 'Swiss rounds' })).not.toBeInTheDocument()
    expect(screen.getByText(hint, { exact: false })).toBeInTheDocument()
    expect(latest).toMatchObject({ topCut: false, plannedRounds: 0 })
  })
})
