import { defineConfig } from 'vitest/config'

// Checks the built examples: run after `pnpm --filter "./examples/*" run build`.
export default defineConfig({
  test: {
    include: ['tests/examples/**/*.test.ts'],
  },
})
