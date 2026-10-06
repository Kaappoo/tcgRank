import { Select as SelectPrimitive } from '@base-ui/react/select'
import { Check, ChevronsUpDown } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '#/lib/utils.ts'
import { inputClassName } from './input.tsx'

export interface SelectOption<T extends string> {
  readonly value: T
  readonly label: ReactNode
}

/** Single-value select with the Base UI popup, styled for the dark floor. */
export function Select<T extends string>({
  options,
  className,
  placeholder,
  ...props
}: Omit<ComponentProps<typeof SelectPrimitive.Root<T>>, 'items' | 'children'> & {
  options: ReadonlyArray<SelectOption<T>>
  className?: string
  placeholder?: string
}) {
  return (
    <SelectPrimitive.Root items={options as Array<SelectOption<T>>} {...props}>
      <SelectPrimitive.Trigger
        className={cn(inputClassName, 'flex cursor-pointer items-center justify-between gap-2 text-left', className)}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon className="text-paper-dim">
          <ChevronsUpDown className="size-4" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner sideOffset={6} className="z-50 outline-none">
          <SelectPrimitive.Popup
            className={cn(
              'min-w-(--anchor-width) origin-(--transform-origin) rounded-lg border border-line bg-popover p-1 shadow-[0_24px_48px_-16px_rgb(0_0_0/0.7)]',
              'transition-[opacity,scale] duration-150 ease-out-expo data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0',
            )}
          >
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="grid cursor-pointer grid-cols-[1rem_1fr] items-center gap-2 rounded-md py-2 pr-3 pl-2 text-sm outline-none select-none data-highlighted:bg-orange data-highlighted:text-on-orange"
              >
                <SelectPrimitive.ItemIndicator className="col-start-1">
                  <Check className="size-4" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText className="col-start-2">{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
