import { describe, expect, it } from 'vitest'
import { entriesClosedReason } from './open-entry.ts'

describe('entriesClosedReason', () => {
  it.each([
    ['swiss', 'registration', null],
    ['swiss', 'running', null],
    ['round_robin', 'registration', null],
    ['single_elimination', 'registration', null],
  ] as const)('a %s event in %s has open entry', (pairingSystem, status, topCutSize) => {
    expect(entriesClosedReason({ pairingSystem, status, topCutSize })).toBeNull()
  })

  it.each([
    ['round_robin', 'running', null, 'Entries are closed: the schedule has started'],
    ['single_elimination', 'running', null, 'Entries are closed: the bracket has started'],
    ['swiss', 'running', 4, 'Entries are closed: the top cut has started'],
  ] as const)('a %s event in %s (cut %s) says why entries closed', (pairingSystem, status, topCutSize, reason) => {
    expect(entriesClosedReason({ pairingSystem, status, topCutSize })).toBe(reason)
  })
})
