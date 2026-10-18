import { expect, it } from 'vitest'
import { buildFixture } from '../helpers/vite.js'

it('generates fallbacks from installed Fontsource files missing from the metrics database', async () => {
  const { css } = await buildFixture({
    files: {
      'index.html': '<script type="module" src="/main.js"></script>',
      'main.js': 'import "unfonts.css"; import "./style.css"',
      'style.css': 'body { font-family: "Iosevka Aile", sans-serif } code { font-family: "Iosevka", monospace }',
    },
    options: {
      fontsource: {
        families: [
          { name: 'Iosevka Aile', weights: [300, 400, 500, 700], fallback: { category: 'sans-serif' } },
          { name: 'Iosevka', weights: [400, 700], fallback: { category: 'monospace' } },
        ],
      },
    },
  })

  expect(css).toMatch(/font-family:\s*["']Iosevka Aile fallback["']/)
  expect(css).toMatch(/font-family:\s*["']Iosevka fallback["']/)
  expect(css).toContain('size-adjust:')
  expect(css).toContain('ascent-override:')
  expect(css).toContain('descent-override:')
})
