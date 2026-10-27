import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { scoreRules } from '#/domain/best-of.ts'
import { ScoreStepper } from './score-stepper.tsx'

const games = (name: string) => screen.getByRole('spinbutton', { name })
const add = (name: string) => screen.getByRole('button', { name: `Add a game: ${name}` })
const remove = (name: string) => screen.getByRole('button', { name: `Remove a game: ${name}` })

describe('ScoreStepper', () => {
  it('stops each side at the majority and never lets both reach it', async () => {
    render(<ScoreStepper rules={scoreRules(3)} sides={{ kind: 'mine' }} initial={[0, 0]} onSend={vi.fn()} />)
    await userEvent.click(add('My games'))
    await userEvent.click(add('My games'))
    expect(games('My games')).toHaveAttribute('aria-valuenow', '2')
    expect(add('My games')).toBeDisabled()
    await userEvent.click(add('Their games'))
    expect(games('Their games')).toHaveAttribute('aria-valuenow', '1')
    // 2–2 can't happen in a best of 3.
    expect(add('Their games')).toBeDisabled()
    await userEvent.click(remove('My games'))
    expect(add('Their games')).toBeEnabled()
  })

  it('caps a best of 1 at a single game', async () => {
    render(<ScoreStepper rules={scoreRules(1)} sides={{ kind: 'mine' }} initial={[0, 0]} onSend={vi.fn()} />)
    await userEvent.click(add('Their games'))
    expect(add('Their games')).toBeDisabled()
    expect(add('My games')).toBeDisabled()
    expect(remove('My games')).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Lost 0–1')
  })

  it('lets a best of 5 reach 3–2', async () => {
    render(<ScoreStepper rules={scoreRules(5)} sides={{ kind: 'mine' }} initial={[2, 2]} onSend={vi.fn()} />)
    await userEvent.click(add('My games'))
    expect(add('My games')).toBeDisabled()
    expect(add('Their games')).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Won 3–2')
  })

  it('announces what the score means as it changes', async () => {
    render(<ScoreStepper rules={scoreRules(3)} sides={{ kind: 'mine' }} initial={[1, 1]} onSend={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent('Tie 1–1')
    await userEvent.click(add('Their games'))
    expect(screen.getByRole('status')).toHaveTextContent('Lost 1–2')
  })

  it('names the winning player when labelled with both players', async () => {
    render(
      <ScoreStepper
        rules={scoreRules(3)}
        sides={{ kind: 'players', player1: 'Misty', player2: 'Ash' }}
        initial={[1, 2]}
        onSend={vi.fn()}
      />,
    )
    expect(games('Misty')).toHaveAttribute('aria-valuenow', '1')
    expect(screen.getByRole('status')).toHaveTextContent('Ash wins 2–1')
  })

  it('sends a complete score in one tap', async () => {
    const onSend = vi.fn()
    render(<ScoreStepper rules={scoreRules(3)} sides={{ kind: 'mine' }} initial={[2, 0]} onSend={onSend} />)
    await userEvent.click(screen.getByRole('button', { name: 'Send result' }))
    expect(onSend).toHaveBeenCalledWith([2, 0])
  })

  it('asks once more before sending an incomplete report', async () => {
    const onSend = vi.fn()
    render(<ScoreStepper rules={scoreRules(3)} sides={{ kind: 'mine' }} initial={[0, 0]} onSend={onSend} />)
    await userEvent.click(add('My games'))
    await userEvent.click(screen.getByRole('button', { name: 'Send result' }))
    expect(onSend).not.toHaveBeenCalled()
    expect(screen.getByText(/Not all games reported/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Send anyway' }))
    expect(onSend).toHaveBeenCalledWith([1, 0])
  })

  it('drops the warning when the score changes', async () => {
    render(<ScoreStepper rules={scoreRules(3)} sides={{ kind: 'mine' }} initial={[1, 0]} onSend={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Send result' }))
    await userEvent.click(add('My games'))
    expect(screen.queryByText(/Not all games reported/)).not.toBeInTheDocument()
  })

  it('refuses equal games when the rules do', () => {
    render(
      <ScoreStepper
        rules={scoreRules(3, { allowEqualGames: false })}
        sides={{ kind: 'mine' }}
        initial={[1, 1]}
        onSend={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Send result' })).toBeDisabled()
    expect(screen.getByText('This match can’t end in a tie')).toBeInTheDocument()
  })
})
