import type { ReactNode } from 'react'

/** Split layout for sign-in / sign-up: form on the left, the orange slab on the right. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="relative isolate mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl overflow-hidden lg:grid-cols-2">
      <div className="flex flex-col justify-center gap-8 px-4 py-12 sm:px-6 lg:pr-16">
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-4xl sm:text-5xl">{title}</h1>
          <p className="text-paper-dim">{subtitle}</p>
        </div>
        {children}
      </div>
      <div aria-hidden className="relative hidden lg:block">
        <div className="slab right-[-30%] w-[90%] animate-slab" />
        <p className="absolute right-10 bottom-14 max-w-xs text-right font-display text-3xl text-on-orange">
          Your record follows you to every store.
        </p>
      </div>
    </div>
  )
}
