import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/*.ts',
  ],
  copy: {
    from: 'src/astro/component.astro',
    to: 'dist/astro',
  },
  dts: false,
  unbundle: true,
  onSuccess: 'pnpm tsc -p ./tsconfig.build.json',
  deps: {
    neverBundle: ['@nuxt/schema', '@nuxt/kit'],
  },
})
