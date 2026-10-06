import { injectManifest } from '@serwist/build'
import { build } from 'esbuild'
import { rmSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Bundles src/sw.ts with esbuild, then lets Serwist inject the precache
 * manifest for the client output folder. Runs from the Vite plugin in
 * vite.config.ts right after the client build, before Nitro snapshots
 * the public assets.
 */
export async function buildServiceWorker(publicDir: string) {
  const bundled = join(publicDir, '..', 'sw.bundle.js')
  await build({
    entryPoints: ['src/sw.ts'],
    bundle: true,
    format: 'esm',
    target: 'es2022',
    minify: true,
    outfile: bundled,
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'warning',
  })
  const { count, size, warnings } = await injectManifest({
    swSrc: bundled,
    swDest: join(publicDir, 'sw.js'),
    globDirectory: publicDir,
    globPatterns: ['assets/**/*.{js,css,woff2}', 'icons/*.png', 'favicon.svg', 'manifest.webmanifest'],
    maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
  })
  rmSync(bundled, { force: true })
  for (const w of warnings) console.warn(w)
  return { count, size }
}
