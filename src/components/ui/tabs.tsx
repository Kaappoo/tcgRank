import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import type { ComponentProps } from 'react'
import { cn } from '#/lib/utils.ts'

export const Tabs = TabsPrimitive.Root

export function TabsList({ className, children, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn('relative z-0 flex items-center gap-1 border-b border-line', className)}
      {...props}
    >
      {children}
      <TabsPrimitive.Indicator className="absolute bottom-[-1px] left-0 -z-1 h-[3px] w-(--active-tab-width) translate-x-(--active-tab-left) rounded-full bg-orange transition-[translate,width] duration-300 ease-out-expo" />
    </TabsPrimitive.List>
  )
}

export function TabsTab({ className, ...props }: ComponentProps<typeof TabsPrimitive.Tab>) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-tab"
      className={cn(
        'flex h-11 cursor-pointer items-center gap-2 whitespace-nowrap px-3 text-sm font-semibold text-paper-dim outline-none transition-colors',
        'hover:text-paper data-active:text-paper focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-orange',
        className,
      )}
      {...props}
    />
  )
}

export function TabsPanel({ className, ...props }: ComponentProps<typeof TabsPrimitive.Panel>) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-panel"
      className={cn('pt-6 outline-none data-[hidden]:hidden', className)}
      {...props}
    />
  )
}
