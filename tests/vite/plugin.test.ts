import type { HtmlTagDescriptor } from 'vite'
import { globSync } from 'tinyglobby'
import { describe, expect, it, vi } from 'vitest'
import { googleLoader } from '../../src/loaders/google-fonts.js'
import { getVitePlugin, loadModule } from '../helpers/vite.js'

vi.mock('tinyglobby', () => import('../mocks/tinyglobby.js'))
vi.mock('fontaine', () => import('../mocks/fontaine.js'))

/** Values of the `export const name = <json>;` lines of a generated module. */
function moduleExports(code: string) {
  return Object.fromEntries([...code.matchAll(/^export const (\w+) = (.*);$/gm)]
    .map(([, name, json]) => [name, JSON.parse(json!)]))
}

describe('plugin', () => {
  describe('resolveId', () => {
    it('resolves the virtual modules and nothing else', () => {
      const p = getVitePlugin()

      expect(p.resolveId('unfonts.css')).toBe('\0unfonts.css')
      expect(p.resolveId('unplugin-fonts/head')).toBe('\0unplugin-fonts/head')
      expect(p.resolveId('./style.css')).toBeUndefined()
    })
  })

  describe('unplugin-fonts/head', () => {
    it('exports head links, fontsource imports and fontsource styles', async () => {
      const options = {
        google: { families: ['Roboto'] },
        fontsource: { families: ['Inter'] },
      }
      const p = getVitePlugin(options)

      const { code, map } = await loadModule(p, 'unplugin-fonts/head')

      expect(moduleExports(code)).toEqual({
        links: googleLoader(options.google),
        importMap: ['@fontsource/inter/index.css'],
        styles: '@import "@fontsource/inter/index.css";',
      })
      expect(map).toBeUndefined()
    })

    it.each([
      ['an array', (tags: HtmlTagDescriptor[]) => tags.filter(tag => tag.attrs?.as === 'font'), ['/fonts/MyFont-Bold.woff2']],
      ['false', () => false, []],
    ])('applies linkFilter returning %s to the head links', async (_, linkFilter, hrefs) => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/MyFont-Bold.woff2'])
      const p = getVitePlugin({
        google: { families: ['Roboto'] },
        custom: { families: [{ name: 'MyFont', src: 'public/fonts/*' }], linkFilter },
      })

      const { links } = moduleExports((await loadModule(p, 'unplugin-fonts/head')).code)

      expect(links.map((link: HtmlTagDescriptor) => link.attrs?.href)).toEqual(hrefs)
    })

    it('includes preload links for custom fonts served from the public directory', async () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/MyFont-Bold.woff2'])
      const p = getVitePlugin({ custom: { families: [{ name: 'MyFont', src: 'public/fonts/*' }] } }, { base: '/docs/' })

      const { links } = moduleExports((await loadModule(p, 'unplugin-fonts/head')).code)

      expect(links).toEqual([{
        tag: 'link',
        injectTo: 'head-prepend',
        attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: '/docs/fonts/MyFont-Bold.woff2', crossorigin: 'anonymous' },
      }])
    })
  })

  describe('unfonts.css', () => {
    it('concatenates fontsource imports, custom faces and fallbacks', async () => {
      vi.mocked(globSync).mockReturnValue(['/root/public/fonts/MyFont-Regular.woff2'])
      const p = getVitePlugin({
        fontsource: { families: ['Inter'] },
        custom: { families: [{ name: 'MyFont', src: 'public/fonts/*' }] },
        google: { families: [{ name: 'Roboto', fallback: {} }] },
      })

      const { code } = await loadModule(p, 'unfonts.css')
      const [imports, customFace, fallbackFace] = code.split(/\n(?=@font-face)/)

      expect(imports).toBe('@import "@fontsource/inter/index.css";')
      expect(customFace).toContain('font-family: \'MyFont\';')
      expect(fallbackFace).toContain('font-family: "Roboto fallback";')
    })

    it('is empty without any loader producing CSS', async () => {
      const p = getVitePlugin({ google: { families: ['Roboto'] } })

      expect((await loadModule(p, 'unfonts.css')).code).toBe('')
    })

    it('returns a sourcemap for virtual modules only when requested', async () => {
      const withMap = getVitePlugin({ fontsource: { families: ['Inter'] }, sourcemap: 'true' })
      const withoutMap = getVitePlugin({ fontsource: { families: ['Inter'] } })

      const sourcemap = { mappings: expect.stringMatching(/./) }
      expect((await loadModule(withMap, 'unfonts.css')).map).toMatchObject(sourcemap)
      expect((await loadModule(withMap, 'unplugin-fonts/head')).map).toMatchObject(sourcemap)
      expect((await loadModule(withoutMap, 'unfonts.css')).map).toBeUndefined()
    })
  })

  describe('transform', () => {
    it('appends configured fallbacks to stylesheets', () => {
      const p = getVitePlugin({ google: { families: [{ name: 'Roboto', fallback: {} }] } })

      expect(p.transform(`a { font-family: 'Roboto'; }`, '/src/a.css')?.code).toBe(`a { font-family: 'Roboto', "Roboto fallback"; }`)
      expect(p.transform(`const font = 'Roboto'`, '/src/a.js')).toBeUndefined()
    })
  })
})
