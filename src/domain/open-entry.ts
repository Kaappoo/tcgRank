/**
 * Open entry: an event takes new players, and dropped players can rejoin,
 * until it closes entries. Round robin and single elimination close them at
 * round 1, a Swiss event with a top cut at the cut. Pure, no IO.
 */
import type { PairingSystem } from './event-setup.ts'

interface OpenEntryInput {
  readonly pairingSystem: PairingSystem
  readonly status: 'registration' | 'running' | 'finished'
  /** Set when a Swiss event cuts to its top players. */
  readonly topCutSize: number | null
}

/**
 * Why entries are closed, worded for the cause, or null while entry is open.
 * The service refuses joins with it and the UI shows it in place of the join
 * controls. A finished event is not covered here: it has its own wording.
 */
export const entriesClosedReason = ({ pairingSystem, status, topCutSize }: OpenEntryInput): string | null => {
  if (topCutSize !== null) return 'Entries are closed: the top cut has started'
  if (status === 'registration') return null
  switch (pairingSystem) {
    case 'swiss':
      return null
    case 'round_robin':
      return 'Entries are closed: the schedule has started'
    case 'single_elimination':
      return 'Entries are closed: the bracket has started'
  }
}
