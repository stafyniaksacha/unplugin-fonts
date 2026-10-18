import { globSync } from 'tinyglobby'
import { describe, expect, it, vi } from 'vitest'
import { collectFallbackNames, generateAllFallbacks, transformFontFamilyDeclarations } from '../../src/loaders/fallback.js'

vi.mock('tinyglobby', () => import('../mocks/tinyglobby.js'))
vi.mock('fontaine', () => import('../mocks/fontaine.js'))

describe('fallback font generation', () => {
  describe('custom fonts', () => {
    it('generates fallback CSS when fallback is configured', async () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/Roboto-Regular.woff2'])

      const css = await generateAllFallbacks(
        {
          custom: {
            families: [{
              name: 'Roboto',
              src: 'public/fonts/Roboto-Regular.*',
              fallback: { category: 'sans-serif' },
            }],
          },
        },
        '/root',
      )

      expect(css).toContain('@font-face')
      expect(css).toContain('font-family:')
      expect(css).toContain('size-adjust:')
      expect(css).toContain('ascent-override:')
      expect(css).toContain('descent-override:')
      expect(css).toContain('line-gap-override:')
    })

    it('skips fonts without fallback configured', async () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/Roboto-Regular.woff2'])

      const css = await generateAllFallbacks(
        {
          custom: {
            families: [{
              name: 'Roboto',
              src: 'public/fonts/Roboto-Regular.*',
            }],
          },
        },
        '/root',
      )

      expect(css).toBe('')
    })

    it('uses custom fallback name when provided', async () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/Roboto-Regular.woff2'])

      const { generateFontFace } = await import('../../src/../tests/mocks/fontaine.js')
      generateFontFace.mockClear()

      await generateAllFallbacks(
        {
          custom: {
            families: [{
              name: 'Roboto',
              src: 'public/fonts/Roboto-Regular.*',
              fallback: { name: 'Roboto Override' },
            }],
          },
        },
        '/root',
      )

      expect(generateFontFace).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ name: 'Roboto Override' }),
      )
    })

    it('uses explicit fallback fonts when provided', async () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/Roboto-Regular.woff2'])

      const { getMetricsForFamily, generateFontFace } = await import('../../src/../tests/mocks/fontaine.js')
      generateFontFace.mockClear()
      getMetricsForFamily.mockClear()

      await generateAllFallbacks(
        {
          custom: {
            families: [{
              name: 'Roboto',
              src: 'public/fonts/Roboto-Regular.*',
              fallback: {
                fallbacks: ['Arial', 'Times New Roman'],
              },
            }],
          },
        },
        '/root',
      )

      // Should look up metrics for each specified fallback
      expect(getMetricsForFamily).toHaveBeenCalledWith('Arial')
      expect(getMetricsForFamily).toHaveBeenCalledWith('Times New Roman')
    })
  })

  describe('google fonts', () => {
    it('generates fallback CSS for google fonts with fallback config', async () => {
      const css = await generateAllFallbacks(
        {
          google: {
            families: [{
              name: 'Roboto',
              styles: 'wght@400;700',
              fallback: { category: 'sans-serif' },
            }],
          },
        },
        '/root',
      )

      expect(css).toContain('@font-face')
      expect(css).toContain('font-family:')
      expect(css).toContain('size-adjust:')
      expect(css).toContain('ascent-override:')
      expect(css).toContain('descent-override:')
      expect(css).toContain('line-gap-override:')
    })

    it('skips string-only google font families', async () => {
      const css = await generateAllFallbacks(
        {
          google: {
            families: ['Roboto'],
          },
        },
        '/root',
      )

      expect(css).toBe('')
    })

    it('skips google fonts without fallback configured', async () => {
      const css = await generateAllFallbacks(
        {
          google: {
            families: [{
              name: 'Roboto',
              styles: 'wght@400;700',
            }],
          },
        },
        '/root',
      )

      expect(css).toBe('')
    })
  })

  describe('fontsource fonts', () => {
    it('generates fallback CSS for fontsource fonts with fallback config', async () => {
      const css = await generateAllFallbacks(
        {
          fontsource: {
            families: [{
              name: 'Roboto',
              weights: [400, 700],
              fallback: { category: 'sans-serif' },
            }],
          },
        },
        '/root',
      )

      expect(css).toContain('@font-face')
      expect(css).toContain('font-family:')
      expect(css).toContain('size-adjust:')
      expect(css).toContain('ascent-override:')
      expect(css).toContain('descent-override:')
      expect(css).toContain('line-gap-override:')
    })

    it('strips Variable suffix from fontsource family names', async () => {
      const { getMetricsForFamily } = await import('../../src/../tests/mocks/fontaine.js')
      getMetricsForFamily.mockClear()

      await generateAllFallbacks(
        {
          fontsource: {
            families: [{
              name: 'Roboto Variable',
              variable: true,
              fallback: { category: 'sans-serif' },
            }],
          },
        },
        '/root',
      )

      expect(getMetricsForFamily).toHaveBeenCalledWith('Roboto')
    })

    it('skips string-only fontsource families', async () => {
      const css = await generateAllFallbacks(
        {
          fontsource: {
            families: ['Roboto'],
          },
        },
        '/root',
      )

      expect(css).toBe('')
    })
  })

  describe('typekit fonts', () => {
    it('generates fallback CSS for typekit fonts with fallback config', async () => {
      const css = await generateAllFallbacks(
        {
          typekit: {
            id: 'abc1234',
            families: [{
              name: 'Roboto',
              fallback: { category: 'sans-serif' },
            }],
          },
        },
        '/root',
      )

      expect(css).toContain('@font-face')
    })

    it('skips string-only typekit families', async () => {
      const css = await generateAllFallbacks(
        {
          typekit: {
            id: 'abc1234',
            families: ['Roboto'],
          },
        },
        '/root',
      )

      expect(css).toBe('')
    })

    it('skips typekit fonts without fallback configured', async () => {
      const css = await generateAllFallbacks(
        {
          typekit: {
            id: 'abc1234',
            families: [{ name: 'Roboto' }],
          },
        },
        '/root',
      )

      expect(css).toBe('')
    })

    it('skips typekit without families declared', async () => {
      const css = await generateAllFallbacks(
        {
          typekit: { id: 'abc1234' },
        },
        '/root',
      )

      expect(css).toBe('')
    })
  })

  describe('font-family transform', () => {
    it('appends fallback name to font-family declarations in CSS', () => {
      const names = new Map([['Roboto', 'Roboto fallback']])
      const css = `body { font-family: 'Roboto', sans-serif; }`
      const result = transformFontFamilyDeclarations(css, 'app.css', names)

      expect(result).toBeDefined()
      expect(result!.code).toContain('"Roboto fallback"')
      expect(result!.code).toContain(`'Roboto'`)
    })

    it('does not modify font-family inside @font-face rules', () => {
      const names = new Map([['Roboto', 'Roboto fallback']])
      const css = `@font-face { font-family: 'Roboto'; src: url('roboto.woff2'); }`
      const result = transformFontFamilyDeclarations(css, 'app.css', names)

      expect(result).toBeUndefined()
    })

    it('ignores families without fallback configured', () => {
      const names = new Map([['Roboto', 'Roboto fallback']])
      const css = `body { font-family: 'Open Sans', sans-serif; }`
      const result = transformFontFamilyDeclarations(css, 'app.css', names)

      expect(result).toBeUndefined()
    })

    it('ignores non-CSS files', () => {
      const names = new Map([['Roboto', 'Roboto fallback']])
      const code = `const family = 'Roboto'`
      const result = transformFontFamilyDeclarations(code, 'app.js', names)

      expect(result).toBeUndefined()
    })

    it('handles font shorthand property', () => {
      const names = new Map([['Roboto', 'Roboto fallback']])
      const css = `body { font: 16px 'Roboto', sans-serif; }`
      const result = transformFontFamilyDeclarations(css, 'app.css', names)

      expect(result).toBeDefined()
      expect(result!.code).toContain('"Roboto fallback"')
    })

    it('handles multiple families with fallbacks', () => {
      const names = new Map([
        ['Roboto', 'Roboto fallback'],
        ['Open Sans', 'Open Sans fallback'],
      ])
      const css = `.a { font-family: 'Roboto'; } .b { font-family: 'Open Sans'; }`
      const result = transformFontFamilyDeclarations(css, 'app.css', names)

      expect(result).toBeDefined()
      expect(result!.code).toContain('"Roboto fallback"')
      expect(result!.code).toContain('"Open Sans fallback"')
    })
  })

  describe('collectFallbackNames', () => {
    it('collects names from all loader types', () => {
      const names = collectFallbackNames({
        custom: {
          families: [{ name: 'MyFont', src: './fonts/*', fallback: {} }],
        },
        google: {
          families: [{ name: 'Roboto', fallback: { name: 'Roboto Override' } }],
        },
        fontsource: {
          families: [{ name: 'Inter', weights: [400], fallback: { category: 'sans-serif' } }],
        },
        typekit: {
          id: 'abc',
          families: [{ name: 'Futura PT', fallback: {} }],
        },
      })

      expect(names.get('MyFont')).toBe('MyFont fallback')
      expect(names.get('Roboto')).toBe('Roboto Override')
      expect(names.get('Inter')).toBe('Inter fallback')
      expect(names.get('Futura PT')).toBe('Futura PT fallback')
    })

    it('skips families without fallback', () => {
      const names = collectFallbackNames({
        google: {
          families: [
            { name: 'Roboto', fallback: {} },
            { name: 'Open Sans' },
            'Lato',
          ],
        },
      })

      expect(names.size).toBe(1)
      expect(names.has('Roboto')).toBe(true)
    })
  })

  describe('graceful degradation', () => {
    it('warns and skips when metrics cannot be resolved', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { getMetricsForFamily, readMetrics } = await import('../../src/../tests/mocks/fontaine.js')

      getMetricsForFamily.mockResolvedValueOnce(null)
      readMetrics.mockRejectedValueOnce(new Error('not found'))

      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/Unknown-Regular.woff2'])

      const css = await generateAllFallbacks(
        {
          custom: {
            families: [{
              name: 'UnknownFont',
              src: 'public/fonts/Unknown-Regular.*',
              fallback: { category: 'sans-serif' },
            }],
          },
        },
        '/root',
      )

      expect(css).toBe('')
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('UnknownFont'),
      )

      warn.mockRestore()
    })

    it('warns and skips fontsource families that resolve to no CSS import', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { getMetricsForFamily } = await import('../../src/../tests/mocks/fontaine.js')

      getMetricsForFamily.mockResolvedValueOnce(null)

      const css = await generateAllFallbacks(
        {
          fontsource: {
            families: [{
              name: 'UnknownFont',
              weights: [],
              fallback: { category: 'sans-serif' },
            }],
          },
        },
        '/root',
      )

      expect(css).toBe('')
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('UnknownFont'),
      )

      warn.mockRestore()
    })

    it('returns empty string when no fonts have fallback configured', async () => {
      const css = await generateAllFallbacks({}, '/root')
      expect(css).toBe('')
    })
  })
})
