/**
 * PROTOTYPE tooling — a floating bar that cycles `?variant`-style search params.
 * Dev builds only; never rendered in production.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect } from 'react'

export function PrototypeSwitcher({
  variants,
  current,
  onChange,
}: {
  variants: ReadonlyArray<{ readonly key: string; readonly name: string }>
  current: string
  onChange: (key: string) => void
}) {
  const index = Math.max(
    0,
    variants.findIndex((v) => v.key === current),
  )
  const step = (by: number) => onChange(variants[(index + by + variants.length) % variants.length]!.key)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el?.closest('input, textarea, select, [contenteditable]')) return
      if (e.key === 'ArrowLeft') step(-1)
      if (e.key === 'ArrowRight') step(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!import.meta.env.DEV) return null
  const v = variants[index]!
  return (
    <div className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-1 rounded-full bg-paper p-1 text-ink shadow-lg shadow-black/50">
      <button type="button" aria-label="Previous variant" onClick={() => step(-1)} className="rounded-full p-2 hover:bg-black/10">
        <ChevronLeft className="size-4" />
      </button>
      <span className="px-2 text-sm font-semibold whitespace-nowrap">
        {v.key} · {v.name}
      </span>
      <button type="button" aria-label="Next variant" onClick={() => step(1)} className="rounded-full p-2 hover:bg-black/10">
        <ChevronRight className="size-4" />
      </button>
    </div>
  )
}
