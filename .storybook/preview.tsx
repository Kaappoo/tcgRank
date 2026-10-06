import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Preview } from '@storybook/tanstack-react'
import { Toaster } from '../src/components/ui/toast.tsx'
import '../src/styles/app.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })

const preview: Preview = {
  parameters: {
    layout: 'padded',
    backgrounds: { disable: true },
    a11y: { test: 'error' },
    controls: { matchers: { color: /(background|color)$/i, date: /(At|Date)$/i } },
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <Toaster>
          <div className="dark min-h-[60vh] bg-ink p-6 text-paper">
            <Story />
          </div>
        </Toaster>
      </QueryClientProvider>
    ),
  ],
}

export default preview
