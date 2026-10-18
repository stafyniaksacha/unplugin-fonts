import type { CustomFontFace } from '../../src/types.js'
import { globSync } from 'tinyglobby'
import { describe, expect, it, vi } from 'vitest'
import { callTransformIndexHtml, getVitePlugin } from '../helpers/vite.js'

vi.mock('tinyglobby', () => import('../mocks/tinyglobby.js'))
vi.mock('fontaine', () => import('../mocks/fontaine.js'))

function createBundle(entries: Record<string, { type: string, source?: string, fileName: string, originalFileNames?: string[], name?: string }>) {
  return entries
}

describe('transformIndexHtml', () => {
  describe('preload scoping', () => {
    it('only preloads custom font files, not fontsource fonts', () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/MyFont-Bold.woff2'])

      const p = getVitePlugin({
        fontsource: {
          families: ['Roboto'],
        },
        custom: {
          families: [{ name: 'MyFont', src: 'public/fonts/MyFont-Bold.*' }],
        },
      })

      const bundle = createBundle({
        'assets/MyFont-Bold-abc123.woff2': {
          type: 'asset',
          fileName: 'assets/MyFont-Bold-abc123.woff2',
          originalFileNames: ['public/fonts/MyFont-Bold.woff2'],
          source: '',
        },
        'assets/roboto-latin-400-normal-xyz789.woff2': {
          type: 'asset',
          fileName: 'assets/roboto-latin-400-normal-xyz789.woff2',
          originalFileNames: ['node_modules/@fontsource/roboto/files/roboto-latin-400-normal.woff2'],
          source: '',
        },
      })

      const tags = callTransformIndexHtml(p, bundle)
      const preloadTags = tags.filter(t => t.tag === 'link' && t.attrs?.rel === 'preload' && t.attrs?.as === 'font')

      expect(preloadTags).toHaveLength(1)
      expect(preloadTags[0]!.attrs?.href).toBe('/assets/MyFont-Bold-abc123.woff2')
    })

    it('emits no preload links when there are no custom fonts', () => {
      const p = getVitePlugin({
        fontsource: {
          families: ['Roboto'],
        },
      })

      const bundle = createBundle({
        'assets/roboto-latin-400-normal-xyz789.woff2': {
          type: 'asset',
          fileName: 'assets/roboto-latin-400-normal-xyz789.woff2',
          originalFileNames: ['node_modules/@fontsource/roboto/files/roboto-latin-400-normal.woff2'],
          source: '',
        },
      })

      const tags = callTransformIndexHtml(p, bundle)
      const preloadTags = tags.filter(t => t.tag === 'link' && t.attrs?.rel === 'preload' && t.attrs?.as === 'font')

      expect(preloadTags).toHaveLength(0)
    })

    it('respects custom.preload = false', () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/MyFont-Bold.woff2'])

      const p = getVitePlugin({
        custom: {
          families: [{ name: 'MyFont', src: 'public/fonts/MyFont-Bold.*' }],
          preload: false,
          prefetch: false,
        },
      })

      const bundle = createBundle({
        'assets/MyFont-Bold-abc123.woff2': {
          type: 'asset',
          fileName: 'assets/MyFont-Bold-abc123.woff2',
          originalFileNames: ['public/fonts/MyFont-Bold.woff2'],
          source: '',
        },
      })

      const tags = callTransformIndexHtml(p, bundle)
      const preloadTags = tags.filter(t => t.tag === 'link' && t.attrs?.rel === 'preload' && t.attrs?.as === 'font')

      expect(preloadTags).toHaveLength(0)
    })

    it('preloads multiple custom font files', () => {
      vi.mocked(globSync).mockReturnValue([
        '/root/public/fonts/MyFont-Regular.woff2',
        '/root/public/fonts/MyFont-Bold.woff2',
      ])

      const p = getVitePlugin({
        custom: {
          families: [{ name: 'MyFont', src: 'public/fonts/MyFont-*' }],
        },
      })

      const bundle = createBundle({
        'assets/MyFont-Regular-aaa111.woff2': {
          type: 'asset',
          fileName: 'assets/MyFont-Regular-aaa111.woff2',
          originalFileNames: ['public/fonts/MyFont-Regular.woff2'],
          source: '',
        },
        'assets/MyFont-Bold-bbb222.woff2': {
          type: 'asset',
          fileName: 'assets/MyFont-Bold-bbb222.woff2',
          originalFileNames: ['public/fonts/MyFont-Bold.woff2'],
          source: '',
        },
      })

      const tags = callTransformIndexHtml(p, bundle)
      const preloadTags = tags.filter(t => t.tag === 'link' && t.attrs?.rel === 'preload' && t.attrs?.as === 'font')

      expect(preloadTags).toHaveLength(2)
    })
  })

  describe('inlineFontFace', () => {
    it('inlines @font-face rules into a style tag when enabled', () => {
      const p = getVitePlugin({ inlineFontFace: true })

      const cssSource = '@font-face{font-family:Roboto;src:url(/assets/roboto.woff2)}body{color:red}'
      const bundle = createBundle({
        'assets/index-abc.css': {
          type: 'asset',
          fileName: 'assets/index-abc.css',
          source: cssSource,
        },
      })

      const tags = callTransformIndexHtml(p, bundle)
      const styleTags = tags.filter(t => t.tag === 'style')

      expect(styleTags).toHaveLength(1)
      expect(styleTags[0]!.children).toBe('@font-face{font-family:Roboto;src:url(/assets/roboto.woff2)}')
    })

    it('strips @font-face rules from the CSS asset when inlining', () => {
      const p = getVitePlugin({ inlineFontFace: true })

      const cssSource = '@font-face{font-family:Roboto;src:url(/assets/roboto.woff2)}body{color:red}'
      const cssAsset = {
        type: 'asset',
        fileName: 'assets/index-abc.css',
        source: cssSource,
      }
      const bundle = createBundle({ 'assets/index-abc.css': cssAsset })

      callTransformIndexHtml(p, bundle)

      expect(cssAsset.source).toBe('body{color:red}')
    })

    it('inlines multiple @font-face rules from a single CSS file', () => {
      const p = getVitePlugin({ inlineFontFace: true })

      const cssSource = '@font-face{font-family:A;src:url(a.woff2)}@font-face{font-family:B;src:url(b.woff2)}.app{margin:0}'
      const bundle = createBundle({
        'assets/index-abc.css': {
          type: 'asset',
          fileName: 'assets/index-abc.css',
          source: cssSource,
        },
      })

      const tags = callTransformIndexHtml(p, bundle)
      const styleTags = tags.filter(t => t.tag === 'style')

      expect(styleTags).toHaveLength(1)
      expect(styleTags[0]!.children).toBe(
        '@font-face{font-family:A;src:url(a.woff2)}@font-face{font-family:B;src:url(b.woff2)}',
      )
    })

    it('inlines the same rules into every page of a multi-page app', () => {
      const p = getVitePlugin({ inlineFontFace: true })
      const cssAsset = {
        type: 'asset',
        fileName: 'assets/index-abc.css',
        source: '@font-face{font-family:Roboto;src:url(/assets/roboto.woff2)}body{color:red}',
      }
      const bundle = createBundle({ 'assets/index-abc.css': cssAsset })

      const pages = [callTransformIndexHtml(p, bundle), callTransformIndexHtml(p, bundle)]

      for (const tags of pages) {
        expect(tags.filter(t => t.tag === 'style').map(t => t.children))
          .toEqual(['@font-face{font-family:Roboto;src:url(/assets/roboto.woff2)}'])
      }
      expect(cssAsset.source).toBe('body{color:red}')
    })

    it('does not inline when inlineFontFace is not set', () => {
      const p = getVitePlugin({})

      const cssSource = '@font-face{font-family:Roboto;src:url(/assets/roboto.woff2)}body{color:red}'
      const cssAsset = {
        type: 'asset',
        fileName: 'assets/index-abc.css',
        source: cssSource,
      }
      const bundle = createBundle({ 'assets/index-abc.css': cssAsset })

      const tags = callTransformIndexHtml(p, bundle)
      const styleTags = tags.filter(t => t.tag === 'style')

      expect(styleTags).toHaveLength(0)
      expect(cssAsset.source).toBe(cssSource)
    })

    it('does not inline when inlineFontFace is false', () => {
      const p = getVitePlugin({ inlineFontFace: false })

      const cssSource = '@font-face{font-family:Roboto;src:url(/assets/roboto.woff2)}body{color:red}'
      const cssAsset = {
        type: 'asset',
        fileName: 'assets/index-abc.css',
        source: cssSource,
      }
      const bundle = createBundle({ 'assets/index-abc.css': cssAsset })

      const tags = callTransformIndexHtml(p, bundle)
      const styleTags = tags.filter(t => t.tag === 'style')

      expect(styleTags).toHaveLength(0)
      expect(cssAsset.source).toBe(cssSource)
    })

    it('skips non-CSS assets', () => {
      const p = getVitePlugin({ inlineFontFace: true })

      const bundle = createBundle({
        'assets/index-abc.js': {
          type: 'asset',
          fileName: 'assets/index-abc.js',
          source: '@font-face{fake}',
        },
      })

      const tags = callTransformIndexHtml(p, bundle)
      const styleTags = tags.filter(t => t.tag === 'style')

      expect(styleTags).toHaveLength(0)
    })

    it('produces no style tag when CSS has no @font-face rules', () => {
      const p = getVitePlugin({ inlineFontFace: true })

      const bundle = createBundle({
        'assets/index-abc.css': {
          type: 'asset',
          fileName: 'assets/index-abc.css',
          source: 'body{color:red}',
        },
      })

      const tags = callTransformIndexHtml(p, bundle)
      const styleTags = tags.filter(t => t.tag === 'style')

      expect(styleTags).toHaveLength(0)
    })
  })

  describe('links', () => {
    const fontBundle = () => createBundle({
      'assets/MyFont-Bold-abc123.woff2': {
        type: 'asset',
        fileName: 'assets/MyFont-Bold-abc123.woff2',
        originalFileNames: ['public/fonts/MyFont-Bold.woff2'],
        source: '',
      },
    })
    const myFont = { name: 'MyFont', src: 'public/fonts/MyFont-Bold.*' }

    it('emits google/typekit links followed by font preloads', () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/MyFont-Bold.woff2'])
      const p = getVitePlugin({ google: { families: ['Roboto'], preconnect: false }, custom: { families: [myFont] } })

      expect(callTransformIndexHtml(p, fontBundle())).toEqual([
        expect.objectContaining({ attrs: expect.objectContaining({ as: 'style' }) }),
        {
          tag: 'link',
          injectTo: 'head-prepend',
          attrs: {
            rel: 'preload',
            as: 'font',
            type: 'font/woff2',
            href: '/assets/MyFont-Bold-abc123.woff2',
            crossorigin: 'anonymous',
          },
        },
      ])
    })

    it('only emits head links in dev, where there is no bundle', () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/MyFont-Bold.woff2'])
      const p = getVitePlugin({ typekit: { id: 'abc' }, custom: { families: [myFont] } })

      expect(callTransformIndexHtml(p, undefined).map(t => t.attrs?.href)).toEqual(['https://use.typekit.net/abc.css'])
    })

    it('uses rel=prefetch when prefetch is enabled', () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/MyFont-Bold.woff2'])
      const p = getVitePlugin({ custom: { families: [myFont], prefetch: true } })

      expect(callTransformIndexHtml(p, fontBundle()).map(t => t.attrs?.rel)).toEqual(['prefetch'])
    })

    it('injects font links where requested', () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/MyFont-Bold.woff2'])
      const p = getVitePlugin({ custom: { families: [myFont], injectTo: 'body' } })

      expect(callTransformIndexHtml(p, fontBundle()).map(t => t.injectTo)).toEqual(['body'])
    })

    it('prefixes font links with the configured base', () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/MyFont-Bold.woff2'])
      const p = getVitePlugin({ custom: { families: [myFont] } }, { base: '/sub/' })

      expect(callTransformIndexHtml(p, fontBundle()).map(t => t.attrs?.href)).toEqual(['/sub/assets/MyFont-Bold-abc123.woff2'])
    })

    it.each([
      ['prefetch: false (the default)', { prefetch: false }, ['preload']],
      ['preload: true', { preload: true }, ['preload']],
      ['preload: false', { preload: false }, []],
      ['preload: false, prefetch: true', { preload: false, prefetch: true }, ['prefetch']],
    ])('resolves preload/prefetch defaults with %s', (_, flags, rels) => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/MyFont-Bold.woff2'])
      const p = getVitePlugin({ custom: { families: [myFont], ...flags } })

      expect(callTransformIndexHtml(p, fontBundle()).map(t => t.attrs?.rel)).toEqual(rels)
    })

    it.each([
      ['https://cdn.example.com/', 'https://cdn.example.com/assets/MyFont-Bold-abc123.woff2'],
      ['https://cdn.example.com/app', 'https://cdn.example.com/app/assets/MyFont-Bold-abc123.woff2'],
      ['/sub', '/sub/assets/MyFont-Bold-abc123.woff2'],
      ['./', './assets/MyFont-Bold-abc123.woff2'],
    ])('keeps base %s intact in font links', (base, href) => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/MyFont-Bold.woff2'])
      const p = getVitePlugin({ custom: { families: [myFont] } }, { base })

      expect(callTransformIndexHtml(p, fontBundle()).map(t => t.attrs?.href)).toEqual([href])
    })

    it.each([
      ['woff2, the first @font-face source by default', undefined, ['/assets/MyFont-Bold-def456.woff2']],
      ['the first source set by transform', (face: CustomFontFace) => {
        face.files.reverse()
        return face
      }, ['/assets/MyFont-Bold-abc123.ttf']],
    ])('preloads one file per font face: %s', (_, transform, hrefs) => {
      vi.mocked(globSync).mockReturnValue(['/root/src/fonts/MyFont-Bold.ttf', '/root/src/fonts/MyFont-Bold.woff2'])
      const p = getVitePlugin({ custom: { families: [{ ...myFont, ...(transform && { transform }) }] } })

      const tags = callTransformIndexHtml(p, createBundle({
        'assets/MyFont-Bold-abc123.ttf': { type: 'asset', fileName: 'assets/MyFont-Bold-abc123.ttf', originalFileNames: ['src/fonts/MyFont-Bold.ttf'] },
        'assets/MyFont-Bold-def456.woff2': { type: 'asset', fileName: 'assets/MyFont-Bold-def456.woff2', originalFileNames: ['src/fonts/MyFont-Bold.woff2'] },
      }))

      expect(tags.map(t => t.attrs?.href)).toEqual(hrefs)
    })

    it('matches assets by name when the bundler has no originalFileNames (Vite 4 / Rollup 3)', () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/MyFont-Bold.woff2'])
      const p = getVitePlugin({ custom: { families: [myFont] } })

      const tags = callTransformIndexHtml(p, createBundle({
        'assets/MyFont-Bold-abc123.woff2': { type: 'asset', fileName: 'assets/MyFont-Bold-abc123.woff2', name: 'MyFont-Bold.woff2' },
      }))

      expect(tags.map(t => t.attrs?.href)).toEqual(['/assets/MyFont-Bold-abc123.woff2'])
    })

    it.each([
      ['an array', (tags: any[]) => tags.slice(1), ['/assets/MyFont-Bold-abc123.woff2']],
      ['true', () => true, ['https://use.typekit.net/abc.css', '/assets/MyFont-Bold-abc123.woff2']],
      ['false', () => false, []],
    ])('applies linkFilter returning %s to every link', (_, linkFilter, hrefs) => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/MyFont-Bold.woff2'])
      const p = getVitePlugin({ typekit: { id: 'abc' }, custom: { families: [myFont], linkFilter } })

      expect(callTransformIndexHtml(p, fontBundle()).map(t => t.attrs?.href)).toEqual(hrefs)
    })
  })

  describe('vitepress', () => {
    it('injects head entries once per plugin instance across client and server builds', () => {
      const head: unknown[] = []
      vi.stubGlobal('VITEPRESS_CONFIG', { site: { head } })
      const p = getVitePlugin({ typekit: { id: 'abc', defer: false } })

      p.vite.generateBundle({}, {})
      p.vite.generateBundle({}, {})
      expect(head).toHaveLength(1)

      getVitePlugin({ typekit: { id: 'abc', defer: false } }).vite.generateBundle({}, {})
      expect(head).toHaveLength(2)
    })

    it('adds head entries to the VitePress site config instead of the HTML', () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/MyFont-Bold.woff2'])
      const head: unknown[] = []
      vi.stubGlobal('VITEPRESS_CONFIG', { site: { head } })
      const p = getVitePlugin({
        google: { families: ['Roboto'], preconnect: false },
        custom: { families: [{ name: 'MyFont', src: 'public/fonts/MyFont-Bold.*' }] },
      })

      p.vite.generateBundle({}, createBundle({
        'assets/MyFont-Bold-abc123.woff2': {
          type: 'asset',
          fileName: 'assets/MyFont-Bold-abc123.woff2',
          originalFileNames: ['public/fonts/MyFont-Bold.woff2'],
        },
      }))

      expect(head).toEqual([
        // deferred stylesheets become plain stylesheets: VitePress head entries cannot run onload
        ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Roboto&display=swap' }],
        ['link', { rel: 'preload', as: 'font', type: 'font/woff2', href: '/assets/MyFont-Bold-abc123.woff2', crossorigin: 'anonymous' }],
      ])
    })
  })
})
