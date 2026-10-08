import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { flushSync } from 'react-dom'
import type { DeckCard } from '#/domain/deck-list.ts'
import { cn } from '#/lib/utils.ts'

/** The `view-transition-name` shared by the thumbnail and the enlarged card while one morphs into the other. */
const ZOOM_TRANSITION = 'card-zoom'

export interface ZoomItem {
  readonly key: string
  readonly card: DeckCard
  readonly image: string | undefined
}

/** TCGdex serves the same art at two sizes; deck lists store the small one. */
const largeArt = (image: string) => image.replace(/\/low\.webp$/, '/high.webp')

/**
 * Runs a DOM update as a view transition when the browser supports it. The
 * route cross-fade is switched off for it (see `[data-card-zoom]` in app.css)
 * so only the card moves.
 */
const morph = (update: () => void) => {
  if (typeof document.startViewTransition !== 'function') return update()
  const root = document.documentElement
  root.dataset.cardZoom = ''
  const transition = document.startViewTransition(() => flushSync(update))
  void transition.finished.finally(() => delete root.dataset.cardZoom)
}

/**
 * State for zooming into one card of a list. `source` is the card whose
 * thumbnail carries the transition name: the one the zoom flies out of, and
 * back into on close (it follows arrow-key steps).
 */
export function useCardZoom(count: number) {
  const [open, setOpen] = useState<number | null>(null)
  const [source, setSource] = useState<number | null>(null)
  /** -1 or 1 after stepping back or forward, 0 right after opening: picks the slide-in side. */
  const [direction, setDirection] = useState(0)

  const openAt = useCallback((index: number) => {
    flushSync(() => {
      setSource(index)
      setDirection(0)
    })
    morph(() => setOpen(index))
  }, [])

  const close = useCallback(() => morph(() => setOpen(null)), [])

  const step = useCallback(
    (delta: number) => {
      if (open === null || count === 0) return
      const next = (open + delta + count) % count
      setDirection(delta)
      setOpen(next)
      setSource(next)
    },
    [open, count],
  )

  /** Transition name for thumbnail `index`: only the source carries it, and only while closed. */
  const thumbTransition = (index: number) => (open === null && source === index ? ZOOM_TRANSITION : undefined)

  return { open, direction, openAt, close, step, thumbTransition }
}

type CardZoomState = ReturnType<typeof useCardZoom>

/** The enlarged card: a modal over the page, with arrow-key and swipe navigation. */
export function CardZoom({ items, zoom }: { items: ReadonlyArray<ZoomItem>; zoom: CardZoomState }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const swipeStart = useRef<number | null>(null)
  const item = zoom.open === null ? null : items[zoom.open]

  // Layout effect: inside a view transition the dialog must be in the top layer before the new snapshot.
  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (item && !dialog.open) {
      if (typeof dialog.showModal === 'function') return dialog.showModal()
      // No modal support (old browsers, jsdom): open it and move focus in, as showModal would.
      dialog.setAttribute('open', '')
      dialog.querySelector('button')?.focus()
    }
  }, [item])

  // The dialog is the whole screen, so its gestures are wired natively: Esc, arrow keys,
  // a tap outside the card, and a horizontal swipe.
  const { close, step } = zoom
  const isOpen = item !== null
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !isOpen) return
    const onCancel = (e: Event) => {
      e.preventDefault()
      close()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    // A click on the backdrop or the empty space around the card lands on the dialog itself.
    const onClick = (e: MouseEvent) => {
      if (e.target === dialog) close()
    }
    const onPointerDown = (e: PointerEvent) => {
      swipeStart.current = e.pointerType === 'mouse' ? null : e.clientX
    }
    const onPointerUp = (e: PointerEvent) => {
      if (swipeStart.current === null) return
      const dx = e.clientX - swipeStart.current
      swipeStart.current = null
      if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1)
    }
    dialog.addEventListener('cancel', onCancel)
    dialog.addEventListener('keydown', onKeyDown)
    dialog.addEventListener('click', onClick)
    dialog.addEventListener('pointerdown', onPointerDown)
    dialog.addEventListener('pointerup', onPointerUp)
    return () => {
      dialog.removeEventListener('cancel', onCancel)
      dialog.removeEventListener('keydown', onKeyDown)
      dialog.removeEventListener('click', onClick)
      dialog.removeEventListener('pointerdown', onPointerDown)
      dialog.removeEventListener('pointerup', onPointerUp)
    }
  }, [isOpen, close, step])

  if (!item || zoom.open === null) return null

  const go = zoom.step

  return (
    <dialog
      ref={dialogRef}
      aria-label={item.card.name}
      className="card-zoom fixed inset-0 m-0 flex h-dvh max-h-none w-screen max-w-none flex-col items-center justify-center gap-5 overflow-hidden bg-transparent p-4 text-paper backdrop:animate-[zoom-backdrop_240ms_ease-out_both] backdrop:bg-ink/85 backdrop:backdrop-blur-[3px] focus:outline-none"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={zoom.close}
        className="absolute top-4 right-4 cursor-pointer rounded-full border border-line bg-surface p-2 text-paper-dim transition-colors hover:text-paper"
      >
        <X className="size-5" />
      </button>

      <TiltCard key={item.key} item={item} direction={zoom.direction} />

      <div className="flex items-center gap-4">
        <StepButton label="Previous card" disabled={items.length < 2} onClick={() => go(-1)}>
          <ChevronLeft className="size-5" />
        </StepButton>
        <div className="flex min-w-48 flex-col items-center text-center">
          <p className="font-display text-xl">{item.card.name}</p>
          <p className="text-sm text-paper-dim">
            <span className="tabular">{item.card.count}</span> {item.card.count === 1 ? 'copy' : 'copies'}
            {item.card.setCode ? ` · ${item.card.setCode} ${item.card.number}` : ''}
            <span className="tabular">
              {' '}
              · {zoom.open + 1}/{items.length}
            </span>
          </p>
        </div>
        <StepButton label="Next card" disabled={items.length < 2} onClick={() => go(1)}>
          <ChevronRight className="size-5" />
        </StepButton>
      </div>
    </dialog>
  )
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="cursor-pointer rounded-full border border-line bg-surface p-2.5 text-paper-dim transition-[color,scale] hover:text-paper active:scale-90 disabled:invisible"
    >
      {children}
    </button>
  )
}

/**
 * The enlarged card. It tilts toward a mouse pointer and a glare band slides
 * across it like light on a sleeve. Touch and reduced motion get a still card.
 */
function TiltCard({ item, direction }: { item: ZoomItem; direction: number }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [largeLoaded, setLargeLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  const tilt = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = cardRef.current
    if (!el || e.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    el.style.setProperty('--rx', `${(-y * 14).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${(x * 18).toFixed(2)}deg`)
    el.style.setProperty('--glare', `${((x + 0.5) * 100).toFixed(1)}%`)
    el.dataset.tilting = ''
  }
  const settle = () => {
    const el = cardRef.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
    delete el.dataset.tilting
  }

  return (
    <div
      className="perspective-[1200px]"
      style={{ ['--step' as string]: direction }}
      onPointerMove={tilt}
      onPointerLeave={settle}
    >
      <div
        ref={cardRef}
        style={{ viewTransitionName: ZOOM_TRANSITION }}
        className={cn(
          'group/tilt relative aspect-[63/88] h-[min(68dvh,calc((100vw-2rem)*88/63))] overflow-hidden rounded-[4.5%] border border-line bg-surface-raised shadow-[0_50px_90px_-30px_rgb(0_0_0/0.9)]',
          '[transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] transition-transform duration-500 ease-out-expo data-tilting:duration-100',
          direction !== 0 && 'animate-[zoom-step_380ms_var(--ease-out-expo)_both]',
        )}
      >
        {item.image && !failed ? (
          <>
            <img
              src={item.image}
              alt=""
              onError={() => setFailed(true)}
              className="absolute inset-0 size-full object-cover"
            />
            {/* The large art fades in over the small one; if it fails, the small one stays. */}
            <img
              src={largeArt(item.image)}
              alt={item.card.name}
              onLoad={() => setLargeLoaded(true)}
              className={cn(
                'absolute inset-0 size-full object-cover transition-opacity duration-300',
                largeLoaded ? 'opacity-100' : 'opacity-0',
              )}
            />
          </>
        ) : (
          <div className="flex size-full flex-col justify-end p-6">
            <span className="font-display text-3xl leading-tight">{item.card.name}</span>
            {item.card.setCode ? (
              <span className="text-paper-dim">
                {item.card.setCode} {item.card.number}
              </span>
            ) : null}
          </div>
        )}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_38%,color-mix(in_oklab,var(--paper)_28%,transparent)_50%,transparent_62%)] bg-size-[250%_100%] bg-position-[var(--glare,50%)_0] opacity-0 mix-blend-soft-light transition-opacity duration-300 group-data-tilting/tilt:opacity-100"
        />
      </div>
    </div>
  )
}
