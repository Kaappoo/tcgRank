import { titleName, type TitleId } from '#/domain/achievements.ts'
import { cn } from '#/lib/utils.ts'

/** A player's shown title, outlined in trophy gold, under their name. */
export function TitleChip({ title, className }: { title: TitleId | null; className?: string }) {
  if (!title) return null
  return (
    <span
      data-slot="title-chip"
      className={cn(
        'inline-flex w-fit items-center whitespace-nowrap rounded-full border border-trophy px-2 py-0.5 text-[11px] leading-none font-bold text-trophy',
        className,
      )}
    >
      {titleName(title)}
    </span>
  )
}
