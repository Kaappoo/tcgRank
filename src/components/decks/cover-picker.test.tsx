import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { CoverPicker } from './cover-picker.tsx'

const LIST = 'Pokémon: 7\n4 Dreepy TWM 128\n3 Dragapult ex TWM 130\nTrainer: 4\n4 Arven SVI 166'

function Harness() {
  const [value, setValue] = useState<string | null>(null)
  return (
    <>
      <CoverPicker list={LIST} cardImages={{ 'TWM 130': 'https://assets.test/130.webp' }} value={value} onChange={setValue} />
      <output>{value ?? 'automatic'}</output>
    </>
  )
}

describe('CoverPicker', () => {
  it('offers every printing in the list, and a second click goes back to automatic', async () => {
    render(<Harness />)
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    await userEvent.click(screen.getByRole('radio', { name: 'Arven SVI 166' }))
    expect(screen.getByRole('status')).toHaveTextContent('SVI 166')
    await userEvent.click(screen.getByRole('radio', { name: 'Arven SVI 166' }))
    expect(screen.getByRole('status')).toHaveTextContent('automatic')
  })
})
