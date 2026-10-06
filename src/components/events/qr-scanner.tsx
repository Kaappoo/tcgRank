import { Camera, CameraOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '#/components/ui/button.tsx'

interface DetectedBarcode {
  rawValue: string
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<Array<DetectedBarcode>>
}
declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: Array<string> }) => BarcodeDetectorLike
  }
}

/** Extracts a join code from a scanned URL (".../join/ABC123") or a bare code. */
export const codeFromScan = (raw: string): string | null => {
  const match = /\/join\/([A-Za-z0-9]{4,12})/.exec(raw) ?? /^([A-Za-z0-9]{6})$/.exec(raw.trim())
  return match?.[1]?.toUpperCase() ?? null
}

/**
 * In-app scanner for browsers with the BarcodeDetector API (Chrome on Android).
 * Everywhere else the phone's own camera app opens the join link directly.
 */
export function QrScanner({ onCode }: { onCode: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window

  useEffect(() => {
    if (!active || !window.BarcodeDetector) return
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
    let stream: MediaStream | null = null
    let frame = 0
    let cancelled = false

    const scan = async () => {
      if (cancelled || !videoRef.current) return
      try {
        const [hit] = await detector.detect(videoRef.current)
        const code = hit ? codeFromScan(hit.rawValue) : null
        if (code) {
          onCode(code)
          setActive(false)
          return
        }
      } catch {
        // frame not ready yet
      }
      frame = requestAnimationFrame(scan)
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(async (s) => {
        stream = s
        if (!videoRef.current) return
        videoRef.current.srcObject = s
        await videoRef.current.play()
        frame = requestAnimationFrame(scan)
      })
      .catch(() => {
        setError('Camera access was blocked. Type the code instead.')
        setActive(false)
      })

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [active, onCode])

  if (!supported) return null

  return (
    <div className="flex flex-col gap-3">
      {active ? (
        <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-2xl border border-line bg-ink">
          <video ref={videoRef} muted playsInline className="size-full object-cover" />
          <div aria-hidden className="pointer-events-none absolute inset-8 rounded-xl border-2 border-orange/80" />
        </div>
      ) : null}
      <Button variant="outline" onClick={() => setActive((a) => !a)}>
        {active ? <CameraOff /> : <Camera />}
        {active ? 'Stop scanning' : 'Scan the QR code'}
      </Button>
      {error ? <p className="text-sm text-loss">{error}</p> : null}
    </div>
  )
}
