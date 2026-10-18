import { describe, expect, it } from 'vitest'
import { customFontsProject, fontLinkHrefs } from '../helpers/fixtures.js'
import { buildFixture } from '../helpers/vite.js'

describe('custom fonts in a real multi-page build', () => {
  it.each(['/', '/sub/'])('preloads, inlines and falls back with base %s', async (base) => {
    const project = await customFontsProject({ inlineFontFace: true })

    const { html, css } = await buildFixture({ ...project, base })

    for (const page of ['index.html', 'about.html']) {
      const source = html[page]!
      const [publicLink, ...bundledLinks] = fontLinkHrefs(source)
      expect(publicLink).toBe(`${base}fonts/Display-Regular.woff2`)
      expect(bundledLinks.sort()).toEqual([
        expect.stringMatching(new RegExp(`^${base}assets/Body-Bold-[\\w-]+\\.woff2$`)),
        expect.stringMatching(new RegExp(`^${base}assets/Body-Regular-[\\w-]+\\.woff2$`)),
      ])

      const style = source.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? ''
      expect(style).toMatch(/font-family:\s*["']Body["']/)
      expect(style).toMatch(/font-family:\s*["']Display["']/)
      expect(style).toContain('font-weight: 100 900')
      expect(style).toContain('font-display: swap')
      expect(style).toContain(`url('${base}fonts/Display-Regular.woff2')`)
      expect(style).toMatch(new RegExp(`url\\('${base}assets/Body-Regular-[\\w-]+\\.woff2'\\)`))
      expect(style).toMatch(/font-family:\s*"Body fallback"[^}]*size-adjust:/)
    }

    expect(css).not.toContain('@font-face')
    expect(css).toMatch(/font-family:\s*Body,\s*"Body fallback",\s*sans-serif/)
  })
})
