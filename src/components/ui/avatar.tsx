import { AvatarArt } from '#/components/identity/avatar-art.tsx'
import type { Avatar as AvatarValue } from '#/domain/avatar-parts.ts'
import { cn } from '#/lib/utils.ts'

/**
 * A player's avatar: the same head-and-shoulders crop at every size, from the store screen's 24 px to the profile's
 * 128 px. Decorative by default, since it sits next to the player's name; pass `label` when it stands alone.
 */
export function Avatar({
  avatar,
  size,
  label,
  className,
}: {
  avatar: AvatarValue
  size: number
  label?: string
  className?: string
}) {
  return (
    <span
      data-slot="avatar"
      className={cn('inline-flex shrink-0 rounded-full', className)}
      style={{ width: size, height: size }}
    >
      <AvatarArt avatar={avatar} size={size} label={label} />
    </span>
  )
}
