import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['tests/setup.ts'],
    // Every test starts from the mocks' default implementations and real globals.
    mockReset: true,
    restoreMocks: true,
    unstubGlobals: true,
  },
})
