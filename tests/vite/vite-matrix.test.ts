import { existsSync, readdirSync, realpathSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { customFontsProject, fontLinkHrefs } from '../helpers/fixtures.js'
import { buildFixture } from '../helpers/vite.js'

// Every Vite major supported by the examples, using the copy installed for that example.
const examplesDir = fileURLToPath(new URL('../../examples/', import.meta.url))
const examples = readdirSync(examplesDir)
  .filter(name => /^vite-\d+$/.test(name))
  .filter(name => existsSync(join(examplesDir, name, 'node_modules/vite')))

// Without the examples' dependencies (e.g. `pnpm install --filter .`), report a
// skipped test rather than a file without tests.
if (examples.length === 0)
  it.skip('builds with the Vite installed by each examples/vite-N', () => {})

describe.each(examples)('%s', (example) => {
  it('builds custom font faces, preload links and fallbacks', { timeout: 30_000 }, async () => {
    const viteDir = realpathSync(join(examplesDir, example, 'node_modules/vite'))
    const vite = await import(pathToFileURL(join(viteDir, 'dist/node/index.js')).href)
    expect(vite.version.split('.')[0]).toBe(example.replace('vite-', ''))

    const { html, css } = await buildFixture({ ...await customFontsProject(), vite })

    for (const page of ['index.html', 'about.html']) {
      const [publicLink, ...bundledLinks] = fontLinkHrefs(html[page]!)
      expect(publicLink).toBe('/fonts/Display-Regular.woff2')
      expect(bundledLinks.sort()).toEqual([
        expect.stringMatching(/^\/assets\/Body-Bold-[\w-]+\.woff2$/),
        expect.stringMatching(/^\/assets\/Body-Regular-[\w-]+\.woff2$/),
      ])
    }
    expect(css).toMatch(/font-family:\s*["']Body["']/)
    expect(css).toMatch(/font-family:\s*["']Display["']/)
    expect(css).toMatch(/font-family:\s*"Body fallback"[^}]*size-adjust:/)
    expect(css).toMatch(/font-family:\s*Body,\s*"Body fallback",\s*sans-serif/)
  })
})
