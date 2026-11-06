import type { PartnerPokemon } from '#/server/identity/style.ts'
import type { PlayerStyleInput } from '#/shared/schemas.ts'

/** The customise editor's draft: what Done saves, plus the partner card's art for the preview. */
export interface StyleDraft extends PlayerStyleInput {
  readonly partnerPreview: PartnerPokemon | null
}

interface Stored {
  readonly draft: StyleDraft
  /** Done was tapped but the save hasn't reached the server yet. */
  readonly pending: boolean
}

const key = (userId: string) => `tcgrank-style-draft:${userId}`

/**
 * The draft lives on the phone (localStorage), so a reload or bad store Wi-Fi never loses it. Every access is guarded:
 * storage can be unavailable (private windows, blocked site data).
 */
export const styleDraftStore = {
  load(userId: string): Stored | null {
    try {
      const raw = window.localStorage.getItem(key(userId))
      return raw ? (JSON.parse(raw) as Stored) : null
    } catch {
      return null
    }
  },
  save(userId: string, draft: StyleDraft, pending = false) {
    try {
      window.localStorage.setItem(key(userId), JSON.stringify({ draft, pending } satisfies Stored))
    } catch {
      // Storage full or blocked: the draft lives as long as the page.
    }
  },
  clear(userId: string) {
    try {
      window.localStorage.removeItem(key(userId))
    } catch {
      // Nothing to clear.
    }
  },
}

/** The draft without its preview-only fields: what the server function takes. */
export const toInput = ({ partnerPreview: _, ...input }: StyleDraft): PlayerStyleInput => input

/** A failed save that never reached the server (offline, dropped connection), as opposed to a refusal. */
export const isNetworkFailure = (error: unknown): boolean =>
  (typeof navigator !== 'undefined' && !navigator.onLine) ||
  error instanceof TypeError ||
  (error instanceof Error && /fetch|network/i.test(error.message))
