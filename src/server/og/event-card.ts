import { bracketRoundLabel, formatLabel, statusLabel } from '#/lib/format.ts'
import type { EventDetail } from '../events/views.ts'

/**
 * What the event share card says: the status pill ("Semifinal live · Standard" while a bracket round is live) and,
 * once finished, the first name of the player placed 1st.
 */
export const eventCard = ({
  event,
  standings,
}: {
  readonly event: Pick<
    EventDetail['event'],
    'status' | 'currentRound' | 'format' | 'pairingSystem' | 'plannedRounds' | 'topCutSize'
  >
  readonly standings: ReadonlyArray<{ readonly rank: number; readonly player: { readonly name: string } }>
}): { pill: string; champion: string | null } => {
  const roundLabel = event.status === 'running' ? bracketRoundLabel(event) : null
  const champion = event.status === 'finished' ? standings.find((s) => s.rank === 1) : undefined
  return {
    pill: `${statusLabel(event.status, event.currentRound, roundLabel)} · ${formatLabel(event.format)}`,
    champion: champion ? (champion.player.name.split(' ')[0] ?? champion.player.name) : null,
  }
}
