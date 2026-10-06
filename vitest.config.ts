import { defineConfig } from 'vitest/config'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'server',
          environment: 'node',
          include: ['src/domain/**/*.test.ts', 'src/server/**/*.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        plugins: [viteReact()],
        test: {
          name: 'client',
          environment: 'jsdom',
          include: [
            'src/components/**/*.test.tsx',
            'src/routes/**/*.test.tsx',
            'src/lib/**/*.test.ts',
            'src/hooks/**/*.test.ts',
          ],
          setupFiles: ['./tests/setup-client.ts'],
        },
      },
    ],
  },
})
