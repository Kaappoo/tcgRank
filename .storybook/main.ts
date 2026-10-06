import type { StorybookConfig } from '@storybook/tanstack-react'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: '@storybook/tanstack-react',
  staticDirs: ['../public'],
}

export default config
