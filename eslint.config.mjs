import antfu from '@antfu/eslint-config'

export default antfu(
  {
    ignores: [
      '**/.astro',
      'dist',
    ],
    pnpm: {
      catalogs: false,
    },
  },
)
