import { barY, colorLegend, defineChart } from '@tanstack/charts'
import { Chart } from '@tanstack/charts/react'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { tooltip } from '@tanstack/charts/tooltip'
import { useMemo } from 'react'
import type { EventHistoryEntry } from '#/server/profiles/service.ts'

const SERIES = ['Wins', 'Ties', 'Losses'] as const
// Hex values mirror the --orange / --draw / --line-strong tokens (SVG paint can't read oklch vars everywhere).
const COLORS = ['#ff6a1a', '#d9c98f', '#4a4a52'] as const

/**
 * Brief: "Am I improving from event to event?" — one stacked bar per event,
 * oldest to newest, wins on the shared baseline so they compare precisely.
 */
export function ResultsChart({ events }: { events: ReadonlyArray<EventHistoryEntry> }) {
  const definition = useMemo(() => {
    const played = [...events]
      .filter((e) => e.wins + e.losses + e.draws > 0)
      .sort((a, b) => a.startsAt - b.startsAt)
      .slice(-12)
    const labels = played.map(
      (e) =>
        `${new Date(e.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} · ${e.name.slice(0, 14)}`,
    )
    const rows = played.flatMap((e, i) => [
      { event: labels[i]!, result: 'Wins', matches: e.wins },
      { event: labels[i]!, result: 'Ties', matches: e.draws },
      { event: labels[i]!, result: 'Losses', matches: e.losses },
    ])
    return {
      count: played.length,
      chart: defineChart({
        marks: [barY(rows, { x: 'event', y: 'matches', color: 'result', inset: 1.5 })],
        scales: {
          x: { scale: () => scaleBand<string>().domain(labels).padding(0.28) },
          y: {
            scale: scaleLinear,
            nice: true,
            grid: true,
            axis: { label: 'Matches', ticks: { format: (v) => String(v) } },
          },
        },
        color: { domain: [...SERIES], range: [...COLORS], legend: colorLegend({ label: 'Result' }) },
        svgAnimation: true,
        tooltip,
      }),
    }
  }, [events])

  if (definition.count === 0) {
    return <p className="py-10 text-center text-sm text-paper-dim">Play an event and your results will chart here.</p>
  }

  return (
    <div className="text-paper-dim [&_text]:fill-current">
      <Chart
        definition={definition.chart}
        height={260}
        initialWidth={720}
        ariaLabel="Match results per event"
        ariaDescription="Stacked bars showing wins, ties and losses for each of the most recent events, oldest first."
      />
    </div>
  )
}
