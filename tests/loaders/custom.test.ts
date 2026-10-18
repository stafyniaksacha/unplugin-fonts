import type { CssNode } from 'css-tree'
import { parse, walk } from 'css-tree'
import { globSync } from 'tinyglobby'
import { describe, expect, it, vi } from 'vitest'
import { customLoader, customVirtualModule, resolveUserOption } from '../../src/loaders/custom.js'

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

  describe('font face sources', () => {
    it('lists formats from smallest to largest so browsers fetch woff2 first', () => {
      vi.mocked(globSync).mockReturnValue([
        '/root/public/fonts/Roboto-Bold.otf',
        '/root/public/fonts/Roboto-Bold.ttf',
        '/root/public/fonts/Roboto-Bold.woff',
        '/root/public/fonts/Roboto-Bold.woff2',
      ])

      const css = customVirtualModule({ families: [{ name: 'Roboto', src: 'public/fonts/Roboto-Bold.*' }] }, '/root')

      expect(css).toBe([
        '@font-face {',
        '  font-family: \'Roboto\';',
        '  src: url(\'/fonts/Roboto-Bold.woff2\') format(\'woff2\'),',
        '\t\turl(\'/fonts/Roboto-Bold.woff\') format(\'woff\'),',
        '\t\turl(\'/fonts/Roboto-Bold.ttf\') format(\'truetype\'),',
        '\t\turl(\'/fonts/Roboto-Bold.otf\') format(\'opentype\');',
        '  font-weight: 700;',
        '  font-style: normal;',
        '  font-display: auto;',
        '}',
      ].join('\n'))
    })

    it('lists local() sources before downloads so installed fonts are used', () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/Roboto-Regular.woff2'])

      const css = customVirtualModule(
        { families: [{ name: 'Roboto', src: 'public/fonts/Roboto-Regular.*', local: ['Roboto', 'Roboto-Regular'] }] },
        '/root',
      )

      expect(css).toContain(`  src: local('Roboto'),\n\t\tlocal('Roboto-Regular'),\n\t\turl('/fonts/Roboto-Regular.woff2') format('woff2');`)
    })

    it('uses the registered format name for .eot files', () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/Old.eot'])

      const css = customVirtualModule({ families: [{ name: 'Old', src: 'public/fonts/Old.*' }] }, '/root')

      expect(css).toContain('format(\'embedded-opentype\')')
    })

    it('produces CSS that parses without errors, even with quotes in names', () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/It\'s-Bold.woff2'])
      const errors: unknown[] = []

      const css = customVirtualModule(
        { families: [{ name: 'It\'s Font', src: 'public/fonts/*', local: 'It\'s Font Bold' }] },
        '/root',
      )
      const ast = parse(css, { onParseError: error => errors.push(error) })

      expect(errors).toEqual([])
      const values: string[] = []
      walk(ast, { enter: (node: CssNode) => void ((node.type === 'String' || node.type === 'Url') && values.push(node.value)) })
      expect(values).toEqual(['It\'s Font', 'It\'s Font Bold', '/fonts/It\'s-Bold.woff2', 'woff2'])
    })
  })

  describe('public path', () => {
    it('strips the prefix relative to the project root, wherever the root lives', () => {
      vi.mocked(globSync).mockReturnValue(['/home/u/public/site/public/fonts/A-Regular.woff2'])

      const css = customVirtualModule({ families: [{ name: 'A', src: 'public/fonts/A-*' }] }, '/home/u/public/site')

      expect(css).toContain('url(\'/fonts/A-Regular.woff2\')')
    })

    it('only strips the prefix at the start of the path', () => {
      vi.mocked(globSync).mockReturnValue(['/root/assets/public/A-Regular.woff2'])

      const css = customVirtualModule({ families: [{ name: 'A', src: 'assets/public/A-*' }] }, '/root')

      expect(css).toContain('url(\'/assets/public/A-Regular.woff2\')')
    })

    it.each(['public', 'public/', './public', 'public\\'])('strips whole directories only with stripPrefix %j', (stripPrefix) => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/A-Regular.woff2', '/root/publicity/B-Regular.woff2'])

      const css = customVirtualModule({ families: [{ name: 'A', src: '*' }], stripPrefix }, '/root')

      expect(css).toContain('url(\'/fonts/A-Regular.woff2\')')
      expect(css).toContain('url(\'/publicity/B-Regular.woff2\')')
    })

    it('supports a custom prefix', () => {
      vi.mocked(globSync).mockReturnValue(['/root/static/fonts/A-Regular.woff2'])

      const css = customVirtualModule({ families: [{ name: 'A', src: 'static/fonts/A-*' }], stripPrefix: 'static/' }, '/root')

      expect(css).toContain('url(\'/fonts/A-Regular.woff2\')')
    })
  })

  describe('options', () => {
    it('accepts families as a record of sources or family options', () => {
      const { families } = resolveUserOption({
        families: {
          'Roboto': 'public/fonts/Roboto-*',
          'Lato': ['public/fonts/Lato-*', 'public/fonts/LatoExtra-*'],
          'Dancing Script': { src: 'public/fonts/Dancing*', local: 'Dancing Script' },
        },
      })

      expect(families).toEqual([
        { name: 'Roboto', src: 'public/fonts/Roboto-*' },
        { name: 'Lato', src: ['public/fonts/Lato-*', 'public/fonts/LatoExtra-*'] },
        { name: 'Dancing Script', src: 'public/fonts/Dancing*', local: 'Dancing Script' },
      ])
    })

    it('applies the configured font-display', () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/Roboto-Regular.woff2'])

      const css = customVirtualModule({ families: [{ name: 'Roboto', src: 'public/fonts/*' }], display: 'swap' }, '/root')

      expect(css).toContain('font-display: swap;')
    })

    it('lets transform override a face, including with a weight range', () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/Inter-Variable.woff2'])

      const css = customVirtualModule({
        families: [{
          name: 'Inter',
          src: 'public/fonts/*',
          transform(face) {
            face.weight = '100 900'
            return face
          },
        }],
      }, '/root')

      expect(css).toContain('font-weight: 100 900;')
    })

    it('drops faces for which transform returns null', () => {
      vi.mocked(globSync).mockReturnValue([
        '/root/public/fonts/Roboto-Regular.woff2',
        '/root/public/fonts/Roboto-Bold.woff2',
      ])

      const css = customVirtualModule({
        families: [{
          name: 'Roboto',
          src: 'public/fonts/*',
          transform: face => face.basename.endsWith('Bold') ? null : face,
        }],
      }, '/root')

      expect(css.match(/@font-face/g)).toHaveLength(1)
      expect(css).toContain('Roboto-Regular.woff2')
      expect(css).not.toContain('Roboto-Bold.woff2')
    })

    it('infers the weight from keywords anywhere in the file name, family name included', () => {
      // Heuristic by design: `Boldonse` contains "bold". Use `transform` to correct it.
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/Boldonse-Regular.woff2'])

      const css = customVirtualModule({ families: [{ name: 'Boldonse', src: 'public/fonts/*' }] }, '/root')

      expect(css).toContain('font-weight: 700;')
    })
  })

  describe('link tag generation', () => {
    it('preloads the first @font-face source of each public font face', () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/Roboto-Bold.woff', '/root/public/fonts/Roboto-Bold.woff2'])

      const tags = customLoader(
        { families: [{ name: 'Roboto', src: 'public/fonts/Roboto-Bold.*' }] },
        '/root',
      )

      expect(tags).toEqual([{
        tag: 'link',
        injectTo: 'head-prepend',
        attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/Roboto-Bold.woff2', crossorigin: 'anonymous' },
      }])
    })

    it('preloads the first source set by transform', () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/Roboto-Bold.woff', '/root/public/fonts/Roboto-Bold.woff2'])

      const tags = customLoader({
        families: [{
          name: 'Roboto',
          src: 'public/fonts/*',
          transform(face) {
            face.files.reverse()
            return face
          },
        }],
      }, '/root')

      expect(tags.map(tag => tag.attrs?.href)).toEqual(['/fonts/Roboto-Bold.woff'])
    })

    it('leaves fonts outside the public directory to the bundler', () => {
      vi.mocked(globSync).mockReturnValue(['/root/src/assets/fonts/Roboto-Bold.woff2'])

      expect(customLoader({ families: [{ name: 'Roboto', src: 'src/assets/fonts/*' }] }, '/root')).toEqual([])
    })

    it('prefixes links with the base, unless prefetchPrefix is set', () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/Roboto-Bold.woff2'])
      const families = [{ name: 'Roboto', src: 'public/fonts/*' }]

      expect(customLoader({ families }, '/root', '/app/')[0]!.attrs?.href).toBe('/app/fonts/Roboto-Bold.woff2')
      expect(customLoader({ families, prefetchPrefix: 'https://cdn.example.com/' }, '/root', '/app/')[0]!.attrs?.href)
        .toBe('https://cdn.example.com/fonts/Roboto-Bold.woff2')
    })

    it('generates prefetch link tags when prefetch is enabled', () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/Roboto-Bold.woff2'])

      const tags = customLoader(
        { families: [{ name: 'Roboto', src: 'public/fonts/Roboto-Bold.*' }], preload: false, prefetch: true },
        '/root',
      )

      expect(tags[0]!.attrs?.rel).toBe('prefetch')
    })

    it('generates nothing when both preload and prefetch are disabled', () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/Roboto-Bold.woff2'])

      expect(customLoader({ families: [{ name: 'Roboto', src: 'public/fonts/*' }], preload: false }, '/root')).toEqual([])
    })

    it('warns once when both preload and prefetch are enabled together', () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/Roboto-Bold.woff2'])
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      customLoader(
        {
          families: [{ name: 'Roboto', src: 'public/fonts/*' }, { name: 'Lato', src: 'public/fonts/*' }],
          preload: true,
          prefetch: true,
        },
        '/root',
      )

      expect(warn).toHaveBeenCalledTimes(1)
    })

    it('warns once per configuration, however often links are generated', () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/Roboto-Bold.woff2'])
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const options = { families: [{ name: 'Roboto', src: 'public/fonts/*' }], preload: true, prefetch: true }

      for (let page = 0; page < 3; page++)
        customLoader(options, '/root')
      expect(warn).toHaveBeenCalledTimes(1)

      customLoader({ ...options }, '/root')
      expect(warn).toHaveBeenCalledTimes(2)
    })
  })
})
