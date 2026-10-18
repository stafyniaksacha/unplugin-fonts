import type { HtmlTagDescriptor } from 'vite'
import { globSync } from 'tinyglobby'
import { describe, expect, it, vi } from 'vitest'
import plugin from '../../src/index.js'

vi.mock('tinyglobby', () => import('../mocks/tinyglobby.js'))
vi.mock('fontaine', () => import('../mocks/fontaine.js'))

function createBundle(entries: Record<string, { type: string, source?: string, fileName: string, originalFileNames?: string[], name?: string }>) {
  return entries
}

function getVitePlugin(options: Parameters<typeof plugin.raw>[0]) {
  const p = plugin.raw(options, { framework: 'vite', versions: {} }) as any
  // simulate configResolved
  p.vite.configResolved({ root: '/root', base: '/' })
  return p
}

function callTransformIndexHtml(p: any, bundle: any) {
  return p.vite.transformIndexHtml.handler('', { bundle }) as HtmlTagDescriptor[]
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
})
