import { useDebouncedValue } from '@tanstack/react-pacer'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { Lock, RotateCcw } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { SubmitButton } from '#/components/ui/submit-button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { toast } from '#/components/ui/toast.tsx'
import {
  ACHIEVEMENTS,
  TITLES,
  achievement,
  tierForTitle,
  type AchievementId,
  type TitleId,
} from '#/domain/achievements.ts'
import {
  AVATAR_PARTS,
  BANNERS,
  CLOTHING_COLOURS,
  TROPHY_ITEMS,
  type AvatarPart,
  type AvatarSlot,
  type TrophyItemId,
} from '#/domain/avatar-parts.ts'
import { useHydrated } from '#/hooks/use-hydrated.ts'
import { styleDraftStore, type StyleDraft } from '#/lib/style-draft.ts'
import { cn } from '#/lib/utils.ts'
import { searchPartnerCards } from '#/server/functions/identity.ts'
import type { StyleEditor } from '#/server/identity/player-style.ts'
import { AchievementBadge, badgeName } from './achievement-badge.tsx'
import { AvatarArt } from './avatar-art.tsx'
import { PlaymatBanner, bannerHex } from './playmat-banner.tsx'
import { PartnerCard } from './trainer-card.tsx'
import { TitleChip } from './title-chip.tsx'

export const STUDIO_SLOTS = [
  { key: 'skin', label: 'Skin' },
  { key: 'hair', label: 'Hair' },
  { key: 'facialHair', label: 'Facial hair' },
  { key: 'face', label: 'Face' },
  { key: 'top', label: 'Top' },
  { key: 'hat', label: 'Hat' },
  { key: 'accessory', label: 'Accessory' },
  { key: 'sleeve', label: 'Sleeve colour' },
  { key: 'banner', label: 'Banner' },
  { key: 'partner', label: 'Partner Pokémon' },
  { key: 'title', label: 'Title' },
  { key: 'badges', label: 'Badges' },
  { key: 'deck', label: 'Featured deck' },
] as const
export type StudioSlot = (typeof STUDIO_SLOTS)[number]['key']

/** "Reach Champion 1 · Win events": what earns a trophy item or title. */
const requirement = (id: AchievementId, tier: number) => `Reach ${badgeName(id, tier)} · ${achievement(id).description}`
const trophyRequirement = (id: TrophyItemId) => {
  const item = TROPHY_ITEMS.find((t) => t.id === id)!
  return requirement(item.earnedAt.achievement, item.earnedAt.tier)
}

export const draftFrom = (editor: StyleEditor): StyleDraft => ({
  avatar: editor.style.avatar,
  sleeveColour: editor.style.sleeveColour,
  banner: editor.style.banner,
  bannerColour: editor.style.bannerColour,
  title: editor.style.title,
  showcase: [...editor.style.showcase],
  featuredDeckId: editor.style.featuredDeckId,
  partner: editor.style.partner ? { cardId: editor.style.partner.cardId, name: editor.style.partner.name } : null,
  partnerPreview: editor.style.partner,
})

const NewTag = () => (
  <span className="absolute -top-1.5 -left-1 rounded bg-orange px-1 py-px text-[9px] font-extrabold text-on-orange">
    NEW
  </span>
)

/** One option tile: a thumbnail, its name, and the silhouette treatment while it's locked. */
function Option({
  label,
  pressed,
  locked,
  isNew,
  onPick,
  children,
  className,
}: {
  label: string
  pressed: boolean
  locked?: boolean
  isNew?: boolean
  onPick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={locked ? `${label} (locked)` : label}
      onClick={onPick}
      className={cn(
        'relative grid min-h-11 cursor-pointer justify-items-center gap-1 rounded-xl border border-line bg-surface px-1 py-1.5 text-[11px] text-paper-dim transition-colors hover:border-line-strong',
        pressed && 'border-orange text-paper shadow-[inset_0_0_0_1px_var(--orange)]',
        className,
      )}
    >
      {isNew ? <NewTag /> : null}
      <span className={cn('relative', locked && '[&_svg]:brightness-0')}>
        {children}
        {locked ? (
          <span aria-hidden className="absolute inset-0 grid place-items-center font-display text-xl text-paper-dim">
            ?
          </span>
        ) : null}
      </span>
      <span className="leading-tight">{locked ? '???' : label}</span>
    </button>
  )
}

function Swatches({
  label,
  value,
  onPick,
  extra,
}: {
  label: string
  value: string | null
  onPick: (id: string) => void
  extra?: ReactNode
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-xs font-bold text-paper-dim">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {extra}
        {CLOTHING_COLOURS.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-label={`${label}: ${c.name}`}
            aria-pressed={value === c.id}
            onClick={() => onPick(c.id)}
            className={cn(
              'size-9 cursor-pointer rounded-full border-2 border-transparent shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]',
              value === c.id && 'border-paper outline-2 -outline-offset-4 outline-ink',
            )}
            style={{ backgroundColor: c.hex }}
          />
        ))}
      </div>
    </fieldset>
  )
}

/**
 * The customise studio: the trainer-card preview fixed at the top, a strip of slots with Reset all at its end, and
 * only the selected slot's options below, each a thumbnail of the player's own avatar wearing it. The draft is kept
 * on the phone; Done hands it to `onDone`.
 */
export function CustomiseStudio({
  editor,
  userId,
  name,
  initialSlot = 'skin',
  onDone,
  saving = false,
}: {
  editor: StyleEditor
  userId: string
  name: string
  initialSlot?: StudioSlot
  onDone: (draft: StyleDraft) => void
  saving?: boolean
}) {
  const hydrated = useHydrated()
  const [draft, setDraft] = useState<StyleDraft>(() => draftFrom(editor))
  const [slot, setSlot] = useState<StudioSlot>(initialSlot)
  const [restored, setRestored] = useState(false)

  // After hydration, pick up a draft left on this phone (a reload, or Done while offline).
  useEffect(() => {
    if (!hydrated || restored) return
    const stored = styleDraftStore.load(userId)
    if (stored) setDraft(stored.draft)
    setRestored(true)
  }, [hydrated, restored, userId])

  const update = (change: Partial<StyleDraft>) =>
    setDraft((current) => {
      const next = { ...current, ...change }
      styleDraftStore.save(userId, next)
      return next
    })
  const setPart = (part: AvatarSlot, id: string) => update({ avatar: { ...draft.avatar, [part]: id } })

  const earnedTrophies = new Set(editor.earned.trophies)
  const earnedTitles = new Set(editor.earned.titles)
  const newTrophies = new Set(editor.newTrophies)
  const newTitles = new Set(editor.newTitles)

  const resetAll = () => {
    const previous = draft.avatar
    update({ avatar: editor.defaultAvatar })
    toast.undo('Avatar reset to your default', () => update({ avatar: previous }))
  }

  const partOptions = (part: AvatarSlot) => (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      <Option
        label="Default"
        pressed={draft.avatar[part] === editor.defaultAvatar[part]}
        onPick={() => setPart(part, editor.defaultAvatar[part])}
      >
        <AvatarArt avatar={{ ...draft.avatar, [part]: editor.defaultAvatar[part] }} size={56} />
      </Option>
      {AVATAR_PARTS[part].map((p: AvatarPart) => {
        const locked = Boolean(p.trophy && !earnedTrophies.has(p.trophy))
        return (
          <Option
            key={p.id}
            label={p.name}
            pressed={draft.avatar[part] === p.id}
            locked={locked}
            isNew={p.trophy ? newTrophies.has(p.trophy) : false}
            onPick={() =>
              locked && p.trophy
                ? toast.show(`${p.name} is a trophy item`, trophyRequirement(p.trophy))
                : setPart(part, p.id)
            }
          >
            <AvatarArt avatar={{ ...draft.avatar, [part]: p.id }} size={56} />
          </Option>
        )
      })}
    </div>
  )

  const colourOptions = (part: AvatarSlot, label: string) => (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-xs font-bold text-paper-dim">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {AVATAR_PARTS[part].map((c) => (
          <button
            key={c.id}
            type="button"
            aria-label={`${label}: ${c.name}`}
            aria-pressed={draft.avatar[part] === c.id}
            onClick={() => setPart(part, c.id)}
            className={cn(
              'size-9 cursor-pointer rounded-full border-2 border-transparent shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]',
              draft.avatar[part] === c.id && 'border-paper outline-2 -outline-offset-4 outline-ink',
            )}
            style={{ backgroundColor: c.hex }}
          />
        ))}
      </div>
    </fieldset>
  )

  const panels: Record<StudioSlot, () => ReactNode> = {
    skin: () => partOptions('skin'),
    hair: () => (
      <>
        {partOptions('hair')}
        {colourOptions('hairColour', 'Hair colour')}
      </>
    ),
    facialHair: () => partOptions('facialHair'),
    face: () => partOptions('face'),
    top: () => (
      <>
        {partOptions('top')}
        {colourOptions('topColour', 'Top colour')}
      </>
    ),
    hat: () => (
      <>
        {partOptions('hat')}
        {colourOptions('hatColour', 'Hat colour')}
        {colourOptions('hatPanel', 'Panel colour')}
      </>
    ),
    accessory: () => partOptions('accessory'),
    sleeve: () => (
      <Swatches label="Sleeve colour" value={draft.sleeveColour} onPick={(id) => update({ sleeveColour: id })} />
    ),
    banner: () => (
      <>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {BANNERS.map((b) => {
            const locked = Boolean(b.trophy && !earnedTrophies.has(b.trophy))
            return (
              <Option
                key={b.id}
                label={b.name}
                pressed={draft.banner === b.id}
                locked={locked}
                isNew={b.trophy ? newTrophies.has(b.trophy) : false}
                onPick={() =>
                  locked && b.trophy
                    ? toast.show(`${b.name} is a trophy item`, trophyRequirement(b.trophy))
                    : update({ banner: b.id })
                }
                className="w-full"
              >
                <span className="block h-10 w-36 overflow-hidden rounded-md">
                  <PlaymatBanner
                    banner={b.id}
                    colour={bannerHex(b.id, draft.bannerColour, draft.sleeveColour)}
                    width={400}
                    height={40}
                  />
                </span>
              </Option>
            )
          })}
        </div>
        <Swatches
          label="Banner colour"
          value={draft.bannerColour}
          onPick={(id) => update({ bannerColour: id })}
          extra={
            <button
              type="button"
              aria-pressed={draft.bannerColour === null}
              onClick={() => update({ bannerColour: null })}
              className={cn(
                'h-9 cursor-pointer rounded-full border border-line px-3 text-xs font-semibold',
                draft.bannerColour === null && 'border-orange text-paper',
              )}
            >
              Match sleeve
            </button>
          }
        />
      </>
    ),
    partner: () => (
      <PartnerPicker
        value={draft.partnerPreview}
        onPick={(card) =>
          update({
            partner: card ? { cardId: card.cardId, name: card.name } : null,
            partnerPreview: card,
          })
        }
      />
    ),
    title: () => (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Option label="No title" pressed={draft.title === null} onPick={() => update({ title: null })}>
          <span className="block h-6" />
        </Option>
        {TITLES.map((t) => {
          const locked = !earnedTitles.has(t.id)
          const { achievement: a, tier } = tierForTitle(t.id)
          return (
            <Option
              key={t.id}
              label={t.name}
              pressed={draft.title === t.id}
              locked={locked}
              isNew={newTitles.has(t.id)}
              onPick={() =>
                locked ? toast.show('A title you haven’t earned yet', requirement(a, tier)) : update({ title: t.id })
              }
            >
              {locked ? <span className="block h-6 w-16" /> : <TitleChip title={t.id as TitleId} />}
            </Option>
          )
        })}
      </div>
    ),
    badges: () => {
      const earned = ACHIEVEMENTS.filter((a) => editor.earned.badges[a.id])
      if (earned.length === 0) return <p className="text-sm text-paper-dim">Badges you earn at events show up here.</p>
      return (
        <>
          <p className="text-sm text-paper-dim">
            Pick up to 3, in the order you want them shown. Tap one again to free its spot.
          </p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {earned.map((a) => {
              const index = draft.showcase.indexOf(a.id)
              const tier = editor.earned.badges[a.id]!
              return (
                <Option
                  key={a.id}
                  label={badgeName(a.id, tier)}
                  pressed={index >= 0}
                  onPick={() =>
                    index >= 0
                      ? update({ showcase: draft.showcase.filter((id) => id !== a.id) })
                      : draft.showcase.length >= 3
                        ? toast.show('Show up to 3 badges', 'Tap a picked badge to free its spot.')
                        : update({ showcase: [...draft.showcase, a.id] })
                  }
                >
                  <AchievementBadge achievement={a.id} tier={tier} size={44} />
                  {index >= 0 ? (
                    <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-orange font-numerals text-xs text-on-orange">
                      {index + 1}
                    </span>
                  ) : null}
                </Option>
              )
            })}
          </div>
        </>
      )
    },
    deck: () => (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          aria-pressed={draft.featuredDeckId === null}
          onClick={() => update({ featuredDeckId: null })}
          className={cn(
            'min-h-11 cursor-pointer rounded-xl border border-line bg-surface px-4 py-3 text-left font-semibold',
            draft.featuredDeckId === null && 'border-orange',
          )}
        >
          No featured deck
        </button>
        {editor.decks.length === 0 ? <p className="text-sm text-paper-dim">Save a deck to feature it here.</p> : null}
        {editor.decks.map((d) => (
          <button
            key={d.id}
            type="button"
            disabled={!d.isPublic}
            aria-pressed={draft.featuredDeckId === d.id}
            onClick={() => update({ featuredDeckId: d.id })}
            className={cn(
              'grid min-h-11 cursor-pointer grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left disabled:cursor-default disabled:opacity-50',
              draft.featuredDeckId === d.id && 'border-orange',
            )}
          >
            <span className="min-w-0">
              <span className="block truncate font-semibold">{d.name}</span>
              <span className="block truncate text-sm text-paper-dim">
                {d.isPublic ? (d.archetype ?? 'Public deck') : 'Make it public to feature it'}
              </span>
            </span>
            {d.isPublic ? null : <Lock className="size-4 text-paper-dim" aria-label="Private" />}
          </button>
        ))}
      </div>
    ),
  }

  const badges = draft.showcase.flatMap((id) => {
    const tier = editor.earned.badges[id]
    return tier ? [{ achievement: id, tier }] : []
  })

  return (
    <form
      className="flex flex-col"
      onSubmit={(e) => {
        e.preventDefault()
        onDone(draft)
      }}
    >
      {/* The preview stays fixed at the top while the options scroll. */}
      <section
        aria-label="Preview"
        className="sticky top-0 z-10 -mx-4 overflow-hidden border-b border-line bg-ink sm:mx-0 sm:rounded-2xl sm:border"
      >
        <div className="h-16 overflow-hidden">
          <PlaymatBanner
            banner={draft.banner}
            colour={bannerHex(draft.banner, draft.bannerColour, draft.sleeveColour)}
            style={{ height: '100%', width: 'auto' }}
          />
        </div>
        <div className="flex items-end gap-3 px-4 pb-3">
          <span className="-mt-10 rounded-full ring-4 ring-ink">
            <AvatarArt avatar={draft.avatar} size={88} label="Your avatar" />
          </span>
          {draft.partnerPreview ? <PartnerCard partner={draft.partnerPreview} className="w-11 sm:w-11" /> : null}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <TitleChip title={draft.title as TitleId | null} />
            <p className="truncate font-display text-xl">{name}</p>
          </div>
          <div className="flex gap-1.5">
            {badges.map((b) => (
              <AchievementBadge
                key={b.achievement}
                achievement={b.achievement as AchievementId}
                tier={b.tier}
                size={28}
              />
            ))}
          </div>
        </div>
      </section>

      <nav
        aria-label="Slots"
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 py-3 [scrollbar-width:none] sm:mx-0 sm:px-0"
      >
        {STUDIO_SLOTS.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={slot === s.key}
            onClick={() => setSlot(s.key)}
            className={cn(
              'min-h-9 shrink-0 cursor-pointer rounded-full border border-line bg-surface px-3 text-sm font-semibold whitespace-nowrap',
              slot === s.key && 'border-paper bg-paper text-ink',
            )}
          >
            {s.label}
          </button>
        ))}
        <button
          type="button"
          onClick={resetAll}
          className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-semibold whitespace-nowrap text-paper-dim hover:text-paper"
        >
          <RotateCcw className="size-3.5" /> Reset all
        </button>
      </nav>

      <section aria-label={STUDIO_SLOTS.find((s) => s.key === slot)!.label} className="flex flex-col gap-5 pb-28">
        {panels[slot]()}
      </section>

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-line bg-surface-raised px-4 py-3 sm:bottom-0">
        <div className="mx-auto flex max-w-3xl items-center justify-end gap-3">
          <p className="mr-auto text-xs text-paper-dim">Changes stay on this phone until you tap Done.</p>
          <SubmitButton size="lg" disabled={saving}>
            {saving ? 'Saving…' : 'Done'}
          </SubmitButton>
        </div>
      </div>
    </form>
  )
}

/** Finds any Pokémon card by name. Tells "no results" apart from "the catalog is unreachable". */
export function PartnerPicker({
  value,
  onPick,
}: {
  value: StyleDraft['partnerPreview']
  onPick: (card: StyleDraft['partnerPreview']) => void
}) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [debounced] = useDebouncedValue(query.trim(), { wait: 300 })
  const search = useServerFn(searchPartnerCards)
  const results = useQuery({
    queryKey: ['partner-search', debounced, page],
    queryFn: () => search({ data: { query: debounced, page } }),
    enabled: debounced.length >= 2,
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 5 * 60_000,
  })

  return (
    <div className="flex flex-col gap-3">
      {value ? (
        <div className="flex items-center gap-3">
          <PartnerCard partner={value} className="rotate-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{value.name}</p>
            {value.setName ? <p className="truncate text-sm text-paper-dim">{value.setName}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => onPick(null)}
            className="cursor-pointer text-sm font-semibold text-orange"
          >
            Remove
          </button>
        </div>
      ) : null}
      <Input
        type="search"
        aria-label="Search Pokémon cards"
        placeholder="Search a Pokémon, e.g. Pikachu"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setPage(1)
        }}
      />
      {debounced.length < 2 ? (
        <p className="text-sm text-paper-dim">Type at least 2 letters.</p>
      ) : results.isError ? (
        <p role="alert" className="rounded-lg border border-loss px-3 py-2 text-sm">
          Couldn’t reach the card catalog. Try again in a moment.
        </p>
      ) : results.data && results.data.cards.length === 0 ? (
        <p className="text-sm text-paper-dim">No Pokémon called “{debounced}”.</p>
      ) : results.data ? (
        <>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label="Cards">
            {results.data.cards.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={value?.cardId === c.id}
                  onClick={() =>
                    onPick({ cardId: c.id, name: c.name, setName: c.setName, imageUrl: c.large ?? c.small })
                  }
                  className={cn(
                    'block w-full cursor-pointer overflow-hidden rounded-[6%] border border-line bg-surface-raised',
                    value?.cardId === c.id && 'outline-2 outline-offset-2 outline-orange',
                  )}
                >
                  {c.small ? (
                    <img
                      src={c.small}
                      alt={`${c.name} · ${c.setName}`}
                      loading="lazy"
                      className="aspect-[63/88] w-full object-cover"
                    />
                  ) : (
                    <span className="flex aspect-[63/88] items-end p-1.5 text-left text-[11px] font-semibold">
                      {c.name} · {c.setName}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <div className="flex justify-between">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="cursor-pointer text-sm font-semibold text-orange disabled:text-paper-dim"
            >
              Previous
            </button>
            <span className="tabular text-sm text-paper-dim">{results.data.total} cards</span>
            <button
              type="button"
              disabled={results.data.nextPage === null}
              onClick={() => setPage((p) => p + 1)}
              className="cursor-pointer text-sm font-semibold text-orange disabled:text-paper-dim"
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm text-paper-dim">Searching…</p>
      )}
    </div>
  )
}
