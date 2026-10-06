import { Check, Copy, Share2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { renderSVG } from 'uqr'
import { Button } from '#/components/ui/button.tsx'
import { joinUrl } from '#/lib/join.ts'
import { cn } from '#/lib/utils.ts'

/** QR code players scan with their camera to land straight in the event. */
export function QrCode({ value, className, label }: { value: string; className?: string; label: string }) {
  const svg = useMemo(
    () => renderSVG(value, { border: 1, ecc: 'M', whiteColor: '#f5f2ee', blackColor: '#0b0b0c', pixelSize: 10 }),
    [value],
  )
  return (
    <div
      role="img"
      aria-label={label}
      className={cn('overflow-hidden rounded-xl bg-paper p-2 [&_svg]:block [&_svg]:size-full', className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

export function JoinQrCard({ code, eventName, origin }: { code: string; eventName: string; origin: string }) {
  const url = joinUrl(origin, code)
  const [copied, setCopied] = useState(false)

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: eventName, text: `Join ${eventName} on tcgRank`, url }).catch(() => {})
      return
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <section
      aria-label="Join this event"
      className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:p-6"
    >
      <QrCode
        value={url}
        label={`QR code to join ${eventName}`}
        className="mx-auto size-44 shrink-0 sm:mx-0 sm:size-40"
      />
      <div className="flex min-w-0 flex-col gap-3">
        <h2 className="font-display text-2xl">Scan to join</h2>
        <p className="text-sm leading-relaxed text-paper-dim">
          Players point their phone camera at the code, sign in, and they&apos;re in the next pairing. No camera? Use
          the code at <span className="text-paper">tcgrank → Join</span>.
        </p>
        <p
          className="font-numerals text-5xl tracking-[0.12em] text-orange"
          aria-label={`Join code ${code.split('').join(' ')}`}
        >
          {code}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={share}>
            {copied ? <Check /> : typeof navigator !== 'undefined' && 'share' in navigator ? <Share2 /> : <Copy />}
            {copied ? 'Link copied' : 'Share link'}
          </Button>
        </div>
      </div>
    </section>
  )
}
