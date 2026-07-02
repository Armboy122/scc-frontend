import { defineConfig } from 'vitest/config'

const config = {
  oxc: {
    jsx: 'react-jsx',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**', 'e2e/**'],
    setupFiles: ['./vitest.setup.ts'],
    css: true,
  },
  resolve: {
    alias: {
      '@': new URL('./', import.meta.url).pathname,
    },
  },
}

export default defineConfig(config as Parameters<typeof defineConfig>[0])
