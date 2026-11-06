import { cn } from '#/lib/utils.ts'
import type { PlayerAchievements } from '#/server/identity/achievements.ts'
import { AchievementBadge } from './achievement-badge.tsx'

/** "ach:tier": the key of an earned tier. */
export const tierKey = (achievement: string, tier: number) => `${achievement}:${tier}`

/**
 * The Achievements tab: every achievement with its badge, tiers, progress and next target. Secret achievements show
 * as "???" until earned. Tiers in `fresh` carry a NEW tag.
 */
export function AchievementsList({
  data,
  fresh = new Set(),
}: {
  data: PlayerAchievements
  fresh?: ReadonlySet<string>
}) {
  return (
    <div className="flex flex-col gap-4 py-4">
      <p className="text-sm text-paper-dim">
        <span className="font-numerals text-3xl text-paper">{data.earnedCount}</span>
        <span className="font-numerals text-xl">/{data.total}</span> badges earned
      </p>
      <ul className="flex flex-col">
        {data.achievements.map((a) => {
          const isNew = a.tiers.some((_, i) => fresh.has(tierKey(a.id, i + 1)))
          return (
            <li
              key={a.id}
              className="grid grid-cols-[3rem_1fr] items-start gap-4 border-b border-line/60 px-2 py-4 sm:grid-cols-[3.5rem_1fr_auto]"
            >
              {a.bestTier > 0 ? (
                <AchievementBadge achievement={a.id} tier={a.bestTier} size={48} />
              ) : (
                <span
                  aria-hidden
                  className="flex size-12 items-center justify-center rounded-full border-2 border-dashed border-line-strong font-numerals text-lg text-paper-dim"
                >
                  {a.hidden ? '?' : ''}
                </span>
              )}
              <div className="flex min-w-0 flex-col gap-1">
                <p className="flex items-center gap-2 font-semibold">
                  {a.name}
                  {isNew ? (
                    <span className="rounded bg-orange px-1.5 py-0.5 text-[10px] font-extrabold text-on-orange">
                      NEW
                    </span>
                  ) : null}
                </p>
                <p className="text-sm text-paper-dim">{a.description}</p>
                {a.hidden ? null : (
                  <ol className="mt-1 flex flex-wrap gap-1.5" aria-label="Tiers">
                    {a.tiers.map((t, i) => (
                      <li
                        key={t.threshold}
                        className={cn(
                          'tabular rounded-full border px-2 py-0.5 text-xs',
                          t.earnedAt !== null ? 'border-paper text-paper' : 'border-line text-paper-dim',
                          t.earnedAt !== null &&
                            i === a.tiers.length - 1 &&
                            a.tiers.length > 1 &&
                            'border-trophy text-trophy',
                        )}
                        aria-label={`${t.threshold} ${a.unit}${t.earnedAt !== null ? ', earned' : ''}`}
                      >
                        {t.threshold}
                        {t.title ? ' · title' : ''}
                        {t.trophies.length > 0 ? ' · item' : ''}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              {a.hidden ? null : (
                <p className="col-start-2 text-sm text-paper-dim sm:col-start-3 sm:text-right">
                  {a.next === null ? (
                    <span className="font-semibold text-paper">Complete</span>
                  ) : (
                    <>
                      <span className="tabular font-semibold text-paper">
                        {Math.min(a.progress, a.next)} / {a.next}
                      </span>{' '}
                      {a.unit}
                    </>
                  )}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
