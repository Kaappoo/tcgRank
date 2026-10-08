import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { LogIn } from 'lucide-react'
import { useState } from 'react'
import { DeckPicker, SKIP_DECK } from '#/components/decks/deck-picker.tsx'
import { Button, buttonVariants } from '#/components/ui/button.tsx'
import type { useEventActions } from '#/hooks/use-event-actions.ts'
import { myDecksQuery } from '#/lib/queries.ts'
import type { EntrantView, EventDetail } from '#/server/events/views.ts'

export interface EntryPanelProps {
  readonly detail: EventDetail
  readonly signedIn: boolean
  readonly busy: boolean
  readonly actions: ReturnType<typeof useEventActions>
  /** A deck just created while joining, to preselect. */
  readonly createdDeck?: string | undefined
}

/** Joining the event, or changing the registered deck while that's still allowed. */
export function EntryPanel({ detail, signedIn, busy, actions, createdDeck }: EntryPanelProps) {
  const { event, viewer } = detail
  const entry = viewer?.entry ?? null

  if (event.status === 'finished' || (viewer?.isHost && !entry)) return null
  if (!signedIn) return <SignInToJoin joinCode={event.joinCode} />

  const registered = entry !== null && entry.droppedAtRound === null
  // Once rounds run, a registered deck is locked; only a missing required deck can still be filled in.
  if (registered && event.status === 'running' && (entry.deckId !== null || !event.deckRequired)) {
    return (
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => actions.leave.mutate()}>
          Drop from event
        </Button>
      </div>
    )
  }
  return (
    <RegisterDeck detail={detail} entry={entry} busy={busy} actions={actions} createdDeck={createdDeck} />
  )
}

function SignInToJoin({ joinCode }: { joinCode: string }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-orange/40 bg-orange/[0.06] p-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-display text-2xl">Playing tonight?</h2>
        <p className="text-paper-dim">Sign in to join and get your pairings on this screen.</p>
      </div>
      <Link to="/sign-in" search={{ redirect: `/join/${joinCode}` }} className={buttonVariants({ size: 'lg' })}>
        <LogIn /> Sign in to join
      </Link>
    </section>
  )
}

const copy = (registered: boolean, missingRequiredDeck: boolean) => {
  if (missingRequiredDeck) {
    return {
      title: 'Register your deck',
      body: 'The host requires a deck for this event. Pick one so you can be paired.',
    }
  }
  if (registered) {
    return { title: "You're registered", body: 'Your pairing appears here as soon as the host starts the round.' }
  }
  return { title: 'Join this event', body: 'Pick the deck you are registering, then join.' }
}

/** The player's choice before anything is picked: their current deck, or their earlier skip. */
const initialChoice = (entry: EntrantView | null, deckRequired: boolean, createdDeck: string | undefined) => {
  if (createdDeck) return createdDeck
  if (!entry) return null
  if (entry.deckId) return entry.deckId
  return deckRequired ? null : SKIP_DECK
}

function RegisterDeck({
  detail: { event },
  entry,
  busy,
  actions,
  createdDeck,
}: Omit<EntryPanelProps, 'signedIn'> & { entry: EntrantView | null }) {
  const { data: decks } = useQuery(myDecksQuery)
  const [choice, setChoice] = useState(() => initialChoice(entry, event.deckRequired, createdDeck))
  const registered = entry !== null && entry.droppedAtRound === null
  const missingRequiredDeck = registered && event.deckRequired && entry.deckId === null
  const deckId = choice === SKIP_DECK ? null : choice
  const { title, body } = copy(registered, missingRequiredDeck)

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl">{title}</h2>
        <p className="text-sm text-paper-dim">{body}</p>
      </div>
      <DeckPicker
        decks={decks}
        eventFormat={event.format}
        required={event.deckRequired}
        value={choice}
        onChange={setChoice}
        joinCode={event.joinCode}
        disabled={busy}
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {registered ? (
          <>
            <Button variant="ghost" disabled={busy} onClick={() => actions.leave.mutate()}>
              {event.status === 'running' ? 'Drop from event' : 'Leave'}
            </Button>
            <Button
              variant="secondary"
              disabled={busy || choice === null || deckId === entry.deckId}
              onClick={() => actions.join.mutate(deckId)}
            >
              {missingRequiredDeck ? 'Register deck' : 'Update deck'}
            </Button>
          </>
        ) : (
          <Button size="lg" disabled={busy || choice === null} onClick={() => actions.join.mutate(deckId)}>
            {entry ? 'Rejoin event' : 'Join event'}
          </Button>
        )}
      </div>
    </section>
  )
}
