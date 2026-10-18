import type { UnpluginContextMeta } from 'unplugin'
import { globSync } from 'tinyglobby'
import { describe, expect, it, vi } from 'vitest'
import { loadModule, rawPlugin } from '../helpers/vite.js'

vi.mock('tinyglobby', () => import('../mocks/tinyglobby.js'))
vi.mock('fontaine', () => import('../mocks/fontaine.js'))

const frameworks: UnpluginContextMeta['framework'][] = ['webpack', 'rspack', 'rollup', 'rolldown', 'esbuild', 'bun']

describe.each(frameworks)('%s', (framework) => {
  it('generates unfonts.css, resolving custom fonts from the working directory', async () => {
    // Only Vite reports its root; other bundlers resolve globs and URLs from process.cwd().
    vi.spyOn(process, 'cwd').mockReturnValue('/project')
    vi.mocked(globSync).mockReturnValue(['/project/public/fonts/MyFont-Bold.woff2'])
    // The plugin never reads the bundler-specific meta (such as the webpack compiler).
    const meta = { framework, versions: {} } as UnpluginContextMeta
    const p = rawPlugin({
      fontsource: { families: ['Inter'] },
      custom: { families: [{ name: 'MyFont', src: 'public/fonts/*' }] },
    }, meta)

    const { code } = await loadModule(p, 'unfonts.css')

    expect(code).toContain('@import "@fontsource/inter/index.css";')
    expect(code).toContain('src: url(\'/fonts/MyFont-Bold.woff2\') format(\'woff2\');')
    expect(globSync).toHaveBeenCalledWith('public/fonts/*', expect.objectContaining({ cwd: undefined }))
  })
})

describe('entry points', () => {
  it.each(['vite', 'webpack', 'rspack', 'rollup', 'rolldown', 'esbuild'])('%s exports a plugin factory', async (entry) => {
    const { default: factory } = await import(`../../src/${entry}.ts`)

    expect(factory).toBeTypeOf('function')
    expect(factory({ google: { families: ['Roboto'] } })).toBeTruthy()
  })

  it('bun exports a plugin factory', async () => {
    // unplugin refuses to build the Bun plugin outside the Bun runtime.
    const { default: factory } = await import('../../src/bun.js')

    expect(factory).toBeTypeOf('function')
  })
})
