import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { standings } from '#/stories/fixtures.ts'
import { renderWithRouter } from '../../../tests/render.tsx'
import { StandingsTable } from './standings-table.tsx'

const headers = () => screen.getAllByRole('columnheader').map((th) => th.textContent)

describe('StandingsTable', () => {
  it('shows Pts, W-L-T, OMW and OOMW for Swiss', async () => {
    await renderWithRouter(<StandingsTable standings={standings} />)
    expect(headers()).toEqual(['#', 'Player', 'Pts', 'W-L-T', 'OMW', 'OOMW'])
  })

  it('shows Pts, W-L-T, GW% and OMW for a round robin, with an H2H tag where head-to-head placed a row', async () => {
    const [first, second, ...rest] = standings
    const rows = [{ ...first!, headToHead: true, gameWinPercentage: 0.625 }, second!, ...rest]
    await renderWithRouter(<StandingsTable standings={rows} tiebreakers="round_robin" />)
    expect(headers()).toEqual(['#', 'Player', 'Pts', 'W-L-T', 'GW%', 'OMW'])
    const [firstRow, secondRow] = screen.getAllByRole('row').slice(1)
    expect(within(firstRow!).getByText('H2H')).toBeInTheDocument()
    expect(within(firstRow!).getByText('62.5%')).toBeInTheDocument()
    expect(within(secondRow!).queryByText('H2H')).not.toBeInTheDocument()
  })
})
