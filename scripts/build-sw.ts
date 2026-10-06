import { injectManifest } from '@serwist/build'
import { build } from 'esbuild'
import { existsSync, rmSync } from 'node:fs'

/**
 * TanStack Start emits client assets to .output/public. We bundle src/sw.ts
 * with esbuild, then let Serwist inject the precache manifest for that folder.
 */
const publicDir = '.output/public'
if (!existsSync(publicDir)) throw new Error(`${publicDir} not found — run "vite build" first`)

const bundled = '.output/sw.bundle.js'
await build({
  entryPoints: ['src/sw.ts'],
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  outfile: bundled,
  define: { 'process.env.NODE_ENV': '"production"' },
})

const { count, size, warnings } = await injectManifest({
  swSrc: bundled,
  swDest: `${publicDir}/sw.js`,
  globDirectory: publicDir,
  globPatterns: ['assets/**/*.{js,css,woff2}', 'icons/*.png', 'favicon.svg', 'manifest.webmanifest'],
  maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
})
rmSync(bundled)
for (const w of warnings) console.warn(w)
console.log(`✓ service worker precaches ${count} files (${(size / 1024).toFixed(0)} KiB)`)
