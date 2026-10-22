import type { Options } from '../../src/types.js'
import { addTemplate, addVitePlugin, addWebpackPlugin } from '@nuxt/kit'
import { globSync } from 'tinyglobby'
import { describe, expect, it, vi } from 'vitest'
import { googleLoader } from '../../src/loaders/google-fonts.js'
import nuxtModule from '../../src/nuxt.js'

vi.mock('tinyglobby', () => import('../mocks/tinyglobby.js'))
vi.mock('fontaine', () => import('../mocks/fontaine.js'))
vi.mock('@nuxt/kit', () => ({
  defineNuxtModule: (definition: unknown) => definition,
  addTemplate: vi.fn(),
  addVitePlugin: vi.fn(),
  addWebpackPlugin: vi.fn(),
}))

interface FakeNuxt {
  options: {
    css: string[]
    rootDir: string
    app: { baseURL: string, buildAssetsDir: string, head: { link?: Record<string, unknown>[] } }
  }
}

function setup(options: Options, { baseURL = '/' } = {}) {
  const nuxt: FakeNuxt = {
    options: { css: [], rootDir: '/root', app: { baseURL, buildAssetsDir: '/_nuxt/', head: {} } },
  }
  ;(nuxtModule as unknown as { setup: (options: Options, nuxt: FakeNuxt) => void }).setup(options, nuxt)
  return nuxt.options
}

function template() {
  const [definition] = vi.mocked(addTemplate).mock.calls[0]!
  return definition as { filename: string, getContents: () => Promise<string> }
}

describe('nuxt module', () => {
  it('adds google and typekit links to the app head', () => {
    const options = { google: { families: ['Roboto'] }, typekit: { id: 'abc' } }

    const { app } = setup(options)

    expect(app.head.link).toEqual([
      { rel: 'preload', as: 'style', onload: 'this.rel=\'stylesheet\'', href: 'https://use.typekit.net/abc.css' },
      ...googleLoader(options.google).map(tag => tag.attrs),
    ])
  })

  it('preloads custom fonts served from the public directory under the app base URL', () => {
    vi.mocked(globSync).mockReturnValue(['/root/public/fonts/MyFont-Bold.woff2'])

    const { app } = setup({ custom: { families: [{ name: 'MyFont', src: './public/fonts/*' }] } }, { baseURL: '/app/' })

    expect(app.head.link).toEqual([
      { rel: 'preload', as: 'font', type: 'font/woff2', href: '/app/fonts/MyFont-Bold.woff2', crossorigin: 'anonymous' },
    ])
  })

  it('applies linkFilter to the app head links', () => {
    vi.mocked(globSync).mockReturnValue(['/root/public/fonts/MyFont-Bold.woff2'])

    const { app } = setup({
      google: { families: ['Roboto'] },
      custom: {
        families: [{ name: 'MyFont', src: './public/fonts/*' }],
        linkFilter: tags => tags.filter(tag => tag.attrs?.as === 'font'),
      },
    })

    expect(app.head.link).toEqual([
      { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/MyFont-Bold.woff2', crossorigin: 'anonymous' },
    ])
  })

  it('does not mutate the user options', () => {
    const options: Options = { custom: { families: [] } }

    setup(options)

    expect(options).toEqual({ custom: { families: [] } })
  })

  it('registers fontsource imports and the generated unfonts.css template', async () => {
    vi.mocked(globSync).mockReturnValue(['/root/public/fonts/MyFont-Bold.woff2'])

    const { css } = setup({
      fontsource: { families: ['Inter'] },
      custom: { families: [{ name: 'MyFont', src: './public/fonts/*' }] },
      google: { families: [{ name: 'Roboto', fallback: {} }] },
    })

    expect(css).toEqual(['@fontsource/inter/index.css', '#build/unfonts.css'])
    expect(template().filename).toBe('unfonts.css')
    const contents = await template().getContents()
    expect(contents).toContain('font-family: \'MyFont\';')
    expect(contents).toContain('src: url(\'/fonts/MyFont-Bold.woff2\') format(\'woff2\');')
    expect(contents).toContain('font-family: "Roboto fallback";')
  })

  it('skips the CSS template when nothing needs it', () => {
    const { css } = setup({ google: { families: ['Roboto'] } })

    expect(css).toEqual([])
    expect(addTemplate).not.toHaveBeenCalled()
  })

  it('registers the plugin for both the vite and webpack builders', () => {
    setup({ google: { families: ['Roboto'] } })

    expect(vi.mocked(addVitePlugin).mock.calls[0]![0]).toMatchObject({ name: 'unplugin-fonts' })
    expect(vi.mocked(addWebpackPlugin)).toHaveBeenCalledTimes(1)
  })
})
