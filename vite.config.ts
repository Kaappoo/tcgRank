import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig, type Plugin } from 'vite'
import { buildServiceWorker } from './scripts/build-sw.ts'

/** Emits the Serwist service worker into the client output after it is written. */
const serwist = (): Plugin => ({
  name: 'tcgrank:serwist',
  apply: 'build',
  applyToEnvironment: (env) => env.name === 'client',
  async writeBundle(options) {
    if (!options.dir) return
    const { count, size } = await buildServiceWorker(options.dir)
    this.info(`service worker precaches ${count} files (${(size / 1024).toFixed(0)} KiB)`)
  },
})

export default defineConfig({
  resolve: { tsconfigPaths: true },
  server: { port: 3000 },
  plugins: [
    devtools(),
    nitro({
      // Native/wasm packages stay external and are traced into .output/server/node_modules.
      traceDeps: ['sharp*', 'satori*', 'harfbuzzjs*', '@libsql*', 'libsql*'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    serwist(),
  ],
})
