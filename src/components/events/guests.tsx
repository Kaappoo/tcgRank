import { useQuery } from '@tanstack/react-query'
import { Check, Copy, Link2, UserMinus, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { QrCode } from '#/components/events/join-qr.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Dialog, DialogContent, DialogTrigger } from '#/components/ui/dialog.tsx'
import { Input } from '#/components/ui/input.tsx'
import { SubmitButton } from '#/components/ui/submit-button.tsx'
import { myGuestsQuery } from '#/lib/queries.ts'
import { guestNameInput } from '#/shared/schemas.ts'
import type { EntrantView } from '#/server/events/views.ts'

type GuestPick = { name: string } | { guestId: string }

/**
 * Host-only: enters someone who has no account or no phone. Type a new name,
 * or tap a guest from earlier events so their results stay together.
 */
export function AddGuestForm({
  players,
  busy,
  onAdd,
}: {
  players: ReadonlyArray<EntrantView>
  busy: boolean
  onAdd: (guest: GuestPick, done: () => void) => void
}) {
  const { data: guests = [] } = useQuery(myGuestsQuery)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const active = new Set(players.filter((p) => p.droppedAtRound === null).map((p) => p.id))
  const returning = guests.filter((g) => !active.has(g.id))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const parsed = guestNameInput.safeParse(name)
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Check the name')
    setError(null)
    onAdd({ name: parsed.data }, () => setName(''))
  }

  return (
    <section aria-labelledby="add-guest" className="mb-5 flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-col gap-1">
        <h3 id="add-guest" className="font-semibold">
          Add a player without an account
        </h3>
        <p className="text-sm text-paper-dim">
          For players with no phone. You or their opponent report their results.
        </p>
      </div>
      <form onSubmit={submit} className="flex gap-2" noValidate>
        <Input
          aria-label="Player name"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={error ? true : undefined}
          autoComplete="off"
        />
        <SubmitButton disabled={busy}>
          <UserPlus /> Add
        </SubmitButton>
      </form>
      {error ? <p className="text-sm text-loss">{error}</p> : null}
      {returning.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-paper-dim">Your guests from earlier events</p>
          <ul className="flex flex-wrap gap-2">
            {returning.map((g) => (
              <li key={g.id}>
                <Button variant="outline" size="sm" disabled={busy} onClick={() => onAdd({ guestId: g.id }, () => {})}>
                  <UserPlus /> {g.name}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

/** Host-only controls on a guest's row: their claim link, and taking them out of the event. */
export function GuestRowActions({
  guest,
  origin,
  started,
  busy,
  onRemove,
}: {
  guest: EntrantView
  origin: string
  started: boolean
  busy: boolean
  onRemove: () => void
}) {
  const { data: guests = [] } = useQuery(myGuestsQuery)
  const claimCode = guests.find((g) => g.id === guest.id)?.claimCode
  return (
    <div className="ml-auto flex shrink-0 items-center">
      {claimCode ? <ClaimLinkDialog name={guest.name} url={`${origin}/claim/${claimCode}`} /> : null}
      {guest.droppedAtRound === null ? (
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={busy}
          aria-label={started ? `Drop ${guest.name}` : `Remove ${guest.name}`}
          title={started ? 'Drop' : 'Remove'}
          onClick={onRemove}
        >
          <UserMinus />
        </Button>
      ) : null}
    </div>
  )
}

function ClaimLinkDialog({ name, url }: { name: string; url: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={`Claim link for ${name}`} title="Claim link" />}
      >
        <Link2 />
      </DialogTrigger>
      <DialogContent
        title={`Claim link for ${name}`}
        description={`When ${name} makes an account, they open this link while signed in and their results move to their profile.`}
      >
        <div className="flex flex-col items-center gap-4">
          <QrCode value={url} label={`QR code to claim ${name}'s results`} className="size-48" />
          <p className="w-full truncate rounded-md border border-line bg-ink/60 px-3 py-2 text-sm text-paper-dim">{url}</p>
          <Button variant="outline" className="w-full" onClick={copy}>
            {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy link'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
