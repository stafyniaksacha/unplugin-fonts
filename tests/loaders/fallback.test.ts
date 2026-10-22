import type { Options } from '../../src/types.js'
import { pathToFileURL } from 'node:url'
import { generateFontFace, getMetricsForFamily, readMetrics, resolveCategoryFallbacks } from 'fontaine'
import { globSync } from 'tinyglobby'
import { describe, expect, it, vi } from 'vitest'
import { collectFallbackNames, generateAllFallbacks, hasFallbacks, transformFontFamilyDeclarations } from '../../src/loaders/fallback.js'
import { arialMetrics, robotoMetrics, timesMetrics } from '../mocks/fontaine.js'

vi.mock('tinyglobby', () => import('../mocks/tinyglobby.js'))
vi.mock('fontaine', () => import('../mocks/fontaine.js'))

/** CSS produced by every `generateFontFace` call so far, in call order. */
function emittedFaces() {
  return vi.mocked(generateFontFace).mock.results.map(result => result.value).join('')
}

const robotoOverArial = { name: 'Roboto fallback', font: 'Arial', metrics: arialMetrics }

describe('fallback font generation', () => {
  describe('custom fonts', () => {
    it('reads metrics from the regular-weight font file, preferring .ttf, when the family is unknown', async () => {
      vi.mocked(globSync).mockReturnValue([
        '/root/public/fonts/MyFont-Bold.woff2',
        '/root/public/fonts/MyFont-Regular.woff2',
        '/root/public/fonts/MyFont-Regular.ttf',
      ])

      const css = await generateAllFallbacks(
        {
          custom: {
            families: [{
              name: 'MyFont',
              src: 'public/fonts/MyFont-*',
              fallback: { category: 'sans-serif' },
            }],
          },
        },
        '/root',
      )

      expect(vi.mocked(readMetrics)).toHaveBeenCalledTimes(1)
      expect(String(vi.mocked(readMetrics).mock.calls[0]![0])).toBe(pathToFileURL('/root/public/fonts/MyFont-Regular.ttf').href)
      expect(generateFontFace).toHaveBeenCalledWith(robotoMetrics, { name: 'MyFont fallback', font: 'Arial', metrics: arialMetrics })
      expect(css).not.toBe('')
      expect(css).toBe(emittedFaces())
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
      expect(generateFontFace).not.toHaveBeenCalled()
    })

    it('uses custom fallback name when provided', async () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/Roboto-Regular.woff2'])

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

      expect(generateFontFace).toHaveBeenCalledWith(robotoMetrics, { ...robotoOverArial, name: 'Roboto Override' })
    })

    it('uses explicit fallback fonts instead of the category defaults', async () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/Roboto-Regular.woff2'])

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

      expect(resolveCategoryFallbacks).not.toHaveBeenCalled()
      expect(vi.mocked(generateFontFace).mock.calls).toEqual([
        [robotoMetrics, robotoOverArial],
        [robotoMetrics, { name: 'Roboto fallback', font: 'Times New Roman', metrics: timesMetrics }],
      ])
    })

    it('passes the configured category to the system fallback resolution', async () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/Roboto-Regular.woff2'])

      await generateAllFallbacks(
        {
          custom: {
            families: [{
              name: 'Roboto',
              src: 'public/fonts/Roboto-Regular.*',
              fallback: { category: 'serif' },
            }],
          },
        },
        '/root',
      )

      expect(resolveCategoryFallbacks).toHaveBeenCalledWith({
        fontFamily: 'Roboto',
        fallbacks: {},
        metrics: { ...robotoMetrics, category: 'serif' },
      })
    })

    it('skips system fonts whose metrics are unknown', async () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/Roboto-Regular.woff2'])

      await generateAllFallbacks(
        {
          custom: {
            families: [{
              name: 'Roboto',
              src: 'public/fonts/Roboto-Regular.*',
              fallback: { fallbacks: ['Unknown System Font', 'Arial'] },
            }],
          },
        },
        '/root',
      )

      expect(vi.mocked(generateFontFace).mock.calls).toEqual([[robotoMetrics, robotoOverArial]])
    })
  })

  describe('google fonts', () => {
    it('generates fallback CSS from the family metrics', async () => {
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

      expect(getMetricsForFamily).toHaveBeenCalledWith('Roboto')
      expect(generateFontFace).toHaveBeenCalledWith(robotoMetrics, robotoOverArial)
      expect(css).not.toBe('')
      expect(css).toBe(emittedFaces())
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
    it('generates fallback CSS from the family metrics', async () => {
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

      expect(getMetricsForFamily).toHaveBeenCalledWith('Roboto')
      expect(generateFontFace).toHaveBeenCalledWith(robotoMetrics, robotoOverArial)
      expect(css).not.toBe('')
      expect(css).toBe(emittedFaces())
    })

    it('strips Variable suffix from fontsource family names', async () => {
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
    it('generates fallback CSS from the family metrics', async () => {
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

      expect(getMetricsForFamily).toHaveBeenCalledWith('Roboto')
      expect(generateFontFace).toHaveBeenCalledWith(robotoMetrics, robotoOverArial)
      expect(css).not.toBe('')
      expect(css).toBe(emittedFaces())
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

  describe('hasFallbacks', () => {
    it.each<[string, Options]>([
      ['custom', { custom: { families: [{ name: 'MyFont', src: './fonts/*', fallback: {} }] } }],
      ['google', { google: { families: [{ name: 'Roboto', fallback: {} }] } }],
      ['fontsource', { fontsource: { families: [{ name: 'Inter', weights: [400], fallback: {} }] } }],
      ['typekit', { typekit: { id: 'abc', families: [{ name: 'Futura PT', fallback: {} }] } }],
    ])('is true when a %s family has a fallback', (_, options) => {
      expect(hasFallbacks(options)).toBe(true)
    })

    it.each<[string, Options]>([
      ['no loaders', {}],
      ['families without fallback', { google: { families: [{ name: 'Roboto' }] }, custom: { families: [{ name: 'MyFont', src: './fonts/*' }] } }],
      ['string-only families', { google: { families: ['Roboto'] }, fontsource: { families: ['Inter'] }, typekit: { id: 'abc', families: ['Futura PT'] } }],
    ])('is false with %s', (_, options) => {
      expect(hasFallbacks(options)).toBe(false)
    })
  })

  describe('font-family transform', () => {
    it('appends fallback name to font-family declarations in CSS', () => {
      const names = new Map([['Roboto', 'Roboto fallback']])
      const css = `body { font-family: 'Roboto', sans-serif; }`
      const result = transformFontFamilyDeclarations(css, 'app.css', names)

      expect(result?.code).toBe(`body { font-family: 'Roboto', "Roboto fallback", sans-serif; }`)
    })

    it('appends fallback name after an unquoted single-word family', () => {
      const names = new Map([['Roboto', 'Roboto fallback']])
      const css = `body { font-family: Roboto, sans-serif; }`
      const result = transformFontFamilyDeclarations(css, 'app.css', names)

      expect(result?.code).toBe(`body { font-family: Roboto, "Roboto fallback", sans-serif; }`)
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

    it('never treats generic families as font names', () => {
      const names = new Map([['monospace', 'monospace fallback']])
      const result = transformFontFamilyDeclarations('code { font-family: monospace; }', 'app.css', names)

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

      expect(result?.code).toBe(`body { font: 16px 'Roboto', "Roboto fallback", sans-serif; }`)
    })

    it('handles multiple families with fallbacks', () => {
      const names = new Map([
        ['Roboto', 'Roboto fallback'],
        ['Open Sans', 'Open Sans fallback'],
      ])
      const css = `.a { font-family: 'Roboto'; } .b { font-family: 'Open Sans'; }`
      const result = transformFontFamilyDeclarations(css, 'app.css', names)

      expect(result?.code).toBe(`.a { font-family: 'Roboto', "Roboto fallback"; } .b { font-family: 'Open Sans', "Open Sans fallback"; }`)
    })

    it('transforms style blocks of Vue single-file components', () => {
      const names = new Map([['Roboto', 'Roboto fallback']])
      const result = transformFontFamilyDeclarations(`.a{font-family:'Roboto'}`, '/src/App.vue?vue&type=style&index=0&lang.css', names)

      expect(result?.code).toBe(`.a{font-family:'Roboto', "Roboto fallback"}`)
    })

    it.each([
      ['plain nesting', `.a { .b { font-family: 'Roboto'; } }`, `.a { .b { font-family: 'Roboto', "Roboto fallback"; } }`],
      ['& nesting', `.a { & .b { font-family: 'Roboto'; } }`, `.a { & .b { font-family: 'Roboto', "Roboto fallback"; } }`],
      ['three levels', `.a { .b { .c { font-family: Roboto } } }`, `.a { .b { .c { font-family: Roboto, "Roboto fallback" } } }`],
      ['nesting inside @media', `@media (min-width: 1px) { .a { .b { font: 16px 'Roboto' } } }`, `@media (min-width: 1px) { .a { .b { font: 16px 'Roboto', "Roboto fallback" } } }`],
    ])('handles %s', (_, css, expected) => {
      const names = new Map([['Roboto', 'Roboto fallback']])

      expect(transformFontFamilyDeclarations(css, 'app.css', names)?.code).toBe(expected)
    })

    it('handles nested rules in SCSS sources', () => {
      const names = new Map([['Roboto', 'Roboto fallback']])
      const scss = `$size: 16px;\n.a {\n  // comment\n  &:hover { font-family: 'Roboto'; }\n  .b { font: 16px 'Roboto'; }\n}`
      const result = transformFontFamilyDeclarations(scss, 'app.scss', names)

      expect(result?.code).toBe(`$size: 16px;\n.a {\n  // comment\n  &:hover { font-family: 'Roboto', "Roboto fallback"; }\n  .b { font: 16px 'Roboto', "Roboto fallback"; }\n}`)
    })

    it('leaves values using preprocessor variables untouched', () => {
      // Known limitation: the transform runs before the preprocessor, and css-tree
      // cannot parse `$size`, so the whole value is kept as raw text.
      const names = new Map([['Roboto', 'Roboto fallback']])

      expect(transformFontFamilyDeclarations(`.a { font: $size 'Roboto'; }`, 'app.scss', names)).toBeUndefined()
    })

    it('leaves custom property values alone', () => {
      const names = new Map([['Roboto', 'Roboto fallback']])

      expect(transformFontFamilyDeclarations(`:root { --font: 'Roboto'; }`, 'app.css', names)).toBeUndefined()
    })

    it('matches unquoted multi-word family names', () => {
      const names = new Map([['Open Sans', 'Open Sans fallback']])

      expect(transformFontFamilyDeclarations(`body { font-family: Open Sans, sans-serif; }`, 'app.css', names)?.code)
        .toBe(`body { font-family: Open Sans, "Open Sans fallback", sans-serif; }`)
      expect(transformFontFamilyDeclarations(`body { font: italic 16px/1.5 Open Sans, sans-serif; }`, 'app.css', names)?.code)
        .toBe(`body { font: italic 16px/1.5 Open Sans, "Open Sans fallback", sans-serif; }`)
    })

    it.each([
      ['a line-height keyword', `body { font: 16px/normal Roboto, sans-serif; }`, `body { font: 16px/normal Roboto, "Roboto fallback", sans-serif; }`],
      ['a size keyword', `body { font: medium Roboto; }`, `body { font: medium Roboto, "Roboto fallback"; }`],
      ['weight and size keywords', `body { font: bold medium Open Sans; }`, `body { font: bold medium Open Sans, "Open Sans fallback"; }`],
    ])('separates %s from the first family of the font shorthand', (_, css, expected) => {
      const names = new Map([['Roboto', 'Roboto fallback'], ['Open Sans', 'Open Sans fallback']])

      expect(transformFontFamilyDeclarations(css, 'app.css', names)?.code).toBe(expected)
    })

    it('does not match the end of an unquoted family name in font-family', () => {
      const names = new Map([['Roboto', 'Roboto fallback']])

      expect(transformFontFamilyDeclarations(`body { font-family: Foo Roboto, sans-serif; }`, 'app.css', names)).toBeUndefined()
    })

    it('matches family names case-insensitively', () => {
      const names = new Map([['Open Sans', 'Open Sans fallback']])

      expect(transformFontFamilyDeclarations(`body { font-family: 'open sans'; }`, 'app.css', names)?.code)
        .toBe(`body { font-family: 'open sans', "Open Sans fallback"; }`)
    })

    it('does not append a fallback that is already listed', () => {
      const names = new Map([['Roboto', 'Roboto fallback']])

      expect(transformFontFamilyDeclarations(`body { font-family: 'Roboto', "Roboto fallback", sans-serif; }`, 'app.css', names))
        .toBeUndefined()
    })

    it('matches the "… Variable" family declared by fontsource variable packages', () => {
      const names = collectFallbackNames({
        fontsource: { families: [{ name: 'Roboto Variable', variable: true, fallback: {} }] },
      })

      expect(transformFontFamilyDeclarations(`body { font-family: 'Roboto Variable', sans-serif; }`, 'app.css', names)?.code)
        .toBe(`body { font-family: 'Roboto Variable', "Roboto fallback", sans-serif; }`)
    })

    it('generates a sourcemap only when requested', () => {
      const names = new Map([['Roboto', 'Roboto fallback']])
      const css = `body { font-family: 'Roboto'; }`

      expect(transformFontFamilyDeclarations(css, 'app.css', names)?.map).toBeUndefined()

      const map = transformFontFamilyDeclarations(css, 'app.css', names, true)?.map
      expect(map.sources).toEqual(['app.css'])
      expect(map.sourcesContent).toEqual([css])
      expect(map.mappings).not.toBe('')
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

    it.each([
      ['named "… Variable"', { name: 'Roboto Variable', variable: true as const, fallback: {} }],
      ['with variable axes', { name: 'Roboto', variable: { wght: true }, fallback: {} }],
    ])('maps both names of a fontsource variable family %s', (_, family) => {
      const names = collectFallbackNames({ fontsource: { families: [family] } })

      expect(Object.fromEntries(names)).toEqual({
        'Roboto': 'Roboto fallback',
        'Roboto Variable': 'Roboto fallback',
      })
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
      vi.mocked(readMetrics).mockRejectedValueOnce(new Error('not found'))
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
    })

    it('warns and skips fontsource families that resolve to no CSS import', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

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
    })

    it('warns and skips fontsource families whose package is not installed', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const css = await generateAllFallbacks(
        {
          fontsource: {
            families: [{
              name: 'Definitely Not Installed',
              weights: [400],
              fallback: { category: 'sans-serif' },
            }],
          },
        },
        process.cwd(),
      )

      expect(css).toBe('')
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Definitely Not Installed'),
      )
    })

    it('returns empty string when no fonts have fallback configured', async () => {
      const css = await generateAllFallbacks({}, '/root')
      expect(css).toBe('')
    })
  })
})
