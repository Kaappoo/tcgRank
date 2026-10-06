import type { ReactNode } from 'react'
import { cn } from '#/lib/utils.ts'

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12', className)}>{children}</div>
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex max-w-2xl flex-col gap-3">
        <h1 className="font-display text-4xl sm:text-5xl">{title}</h1>
        {description ? <p className="text-base leading-relaxed text-paper-dim">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-line-strong px-6 py-14 text-center">
      {icon ? <div className="text-orange [&_svg]:size-8">{icon}</div> : null}
      <div className="flex max-w-sm flex-col gap-2">
        <h2 className="font-display text-xl">{title}</h2>
        <p className="text-sm leading-relaxed text-paper-dim">{description}</p>
      </div>
      {action}
    </div>
  )
}
