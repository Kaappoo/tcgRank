import { readFileSync } from 'node:fs'
import sharp from 'sharp'

/** Renders the PWA / touch icons from public/favicon.svg. Run once after changing the mark. */
const svg = readFileSync('public/favicon.svg')
for (const size of [192, 512]) {
  await sharp(svg, { density: 512 }).resize(size, size).png().toFile(`public/icons/icon-${size}.png`)
}
// Maskable variant keeps the mark inside the 80% safe zone.
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#0b0b0c' } })
  .composite([{ input: await sharp(svg, { density: 512 }).resize(380, 380).png().toBuffer(), gravity: 'center' }])
  .png()
  .toFile('public/icons/maskable-512.png')
console.log('✓ icons written to public/icons')
