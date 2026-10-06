import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar'
import { cn } from '#/lib/utils.ts'
import { initials } from '#/lib/format.ts'

const sizes = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-16 text-xl', xl: 'size-28 text-4xl' } as const

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string
  src?: string | null
  size?: keyof typeof sizes
  className?: string
}) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-surface-raised font-display text-paper ring-1 ring-line',
        sizes[size],
        className,
      )}
    >
      {src ? <AvatarPrimitive.Image src={src} alt="" className="size-full object-cover" /> : null}
      <AvatarPrimitive.Fallback className="font-display">{initials(name) || '?'}</AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}
