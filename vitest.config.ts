import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Built examples are checked separately by `test:examples`.
    exclude: [...configDefaults.exclude, 'tests/examples/**'],
    setupFiles: ['tests/setup.ts'],
    // Every test starts from the mocks' default implementations and real globals.
    mockReset: true,
    restoreMocks: true,
    unstubGlobals: true,
  },
})
