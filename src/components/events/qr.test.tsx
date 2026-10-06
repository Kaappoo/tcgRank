import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { joinUrl, QrCode } from './join-qr.tsx'
import { codeFromScan } from './qr-scanner.tsx'

describe('join QR', () => {
  it('builds the join URL', () => {
    expect(joinUrl('https://tcgrank.app/', 'K7Q2XM')).toBe('https://tcgrank.app/join/K7Q2XM')
  })

  it('renders an SVG QR code with an accessible label', () => {
    render(<QrCode value="https://tcgrank.app/join/K7Q2XM" label="Scan to join" />)
    const img = screen.getByRole('img', { name: 'Scan to join' })
    expect(img.querySelector('svg')).not.toBeNull()
  })

  it.each([
    ['https://tcgrank.app/join/k7q2xm', 'K7Q2XM'],
    ['K7Q2XM', 'K7Q2XM'],
    ['https://example.com/other', null],
  ])('reads %s as %s', (raw, code) => {
    expect(codeFromScan(raw)).toBe(code)
  })
})
