import { globSync } from 'tinyglobby'

import { describe, expect, it, vi } from 'vitest'
import { customLoader, customVirtualModule } from '../../src/loaders/custom.js'

vi.mock('tinyglobby', () => import('../mocks/tinyglobby.js'))

describe('custom fonts loader', () => {
  describe('cSS generation', () => {
    it('generates valid @font-face CSS from font files', () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/Roboto-Regular.woff2'])

      const css = customVirtualModule(
        { families: [{ name: 'Roboto', src: 'public/fonts/Roboto-Regular.*' }] },
        '/root',
      )

      expect(css).toContain('@font-face')
      expect(css).toContain('font-family: \'Roboto\'')
      expect(css).toContain('format(\'woff2\')')
      expect(css).toContain('font-weight: 400')
      expect(css).toContain('font-style: normal')
    })

    it.each([
      ['Thin', 100],
      ['ExtraLight', 200],
      ['UltraLight', 200],
      ['Light', 300],
      ['Regular', 400],
      ['Medium', 500],
      ['SemiBold', 600],
      ['DemiBold', 600],
      ['Bold', 700],
      ['ExtraBold', 800],
      ['UltraBold', 800],
      ['Black', 900],
      ['Heavy', 900],
    ])('infers weight %d from filename keyword "%s"', (keyword, weight) => {
      vi.mocked(globSync).mockReturnValue([`/root/public/fonts/Font-${keyword}.woff2`])

      const css = customVirtualModule(
        { families: [{ name: 'Test', src: `public/fonts/Font-${keyword}.*` }] },
        '/root',
      )

      expect(css).toContain(`font-weight: ${weight}`)
    })

    it('defaults to weight 400 when no keyword matches', () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/MyFont.woff2'])

      const css = customVirtualModule(
        { families: [{ name: 'Test', src: 'public/fonts/MyFont.*' }] },
        '/root',
      )

      expect(css).toContain('font-weight: 400')
    })

    it.each([
      ['Italic', 'italic'],
      ['Oblique', 'oblique'],
      ['Normal', 'normal'],
      ['Regular', 'normal'],
    ])('infers style "%s" from filename keyword "%s"', (keyword, style) => {
      vi.mocked(globSync).mockReturnValue([`/root/public/fonts/Font-${keyword}.woff2`])

      const css = customVirtualModule(
        { families: [{ name: 'Test', src: `public/fonts/Font-${keyword}.*` }] },
        '/root',
      )

      expect(css).toContain(`font-style: ${style}`)
    })

    it('groups multiple file formats into a single @font-face block', () => {
      vi.mocked(globSync).mockReturnValue([
        '/root/public/fonts/Roboto-Bold.woff',
        '/root/public/fonts/Roboto-Bold.woff2',
      ])

      const css = customVirtualModule(
        { families: [{ name: 'Roboto', src: 'public/fonts/Roboto-Bold.*' }] },
        '/root',
      )

      const faceCount = (css.match(/@font-face/g) || []).length
      expect(faceCount).toBe(1)
      expect(css).toContain('format(\'woff\')')
      expect(css).toContain('format(\'woff2\')')
    })
  })

  describe('link tag generation', () => {
    it('generates preload link tags for font files', () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/Roboto-Bold.woff2'])

      const tags = customLoader(
        { families: [{ name: 'Roboto', src: 'public/fonts/Roboto-Bold.*' }] },
        '/root',
      )

      expect(tags).toHaveLength(1)
      expect(tags[0]!.attrs?.rel).toBe('preload')
      expect(tags[0]!.attrs?.as).toBe('font')
      expect(tags[0]!.attrs?.type).toBe('font/woff2')
    })

    it('generates prefetch link tags when prefetch is enabled', () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/Roboto-Bold.woff2'])

      const tags = customLoader(
        { families: [{ name: 'Roboto', src: 'public/fonts/Roboto-Bold.*' }], preload: false, prefetch: true },
        '/root',
      )

      expect(tags[0]!.attrs?.rel).toBe('prefetch')
    })

    it('warns when both preload and prefetch are enabled together', () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/Roboto-Bold.woff2'])
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      customLoader(
        { families: [{ name: 'Roboto', src: 'public/fonts/Roboto-Bold.*' }], preload: true, prefetch: true },
        '/root',
      )

      expect(warn).toHaveBeenCalled()
      warn.mockRestore()
    })
  })
})
