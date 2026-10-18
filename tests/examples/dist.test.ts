import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { fontLinkHrefs } from '../helpers/fixtures.js'

// Checks the output of `pnpm --filter "./examples/*" run build`, so that every
// supported framework and version is verified, not only built.

const examplesDir = fileURLToPath(new URL('../../examples/', import.meta.url))

interface Example {
  name: string
  /** Build output directory, relative to the example. */
  outDir: string
  /** Static page whose head the plugin fills, and the expected preload href of a `Dancing Script` file. */
  page?: { file: string, preload: (file: string) => RegExp }
  /** Server chunks holding the head rendered at runtime (Nuxt). */
  serverDir?: string
  /** Whether the example configures fallback metrics. */
  fallback?: boolean
}

const examples: Example[] = [
  ...[4, 5, 6, 7, 8].map(version => ({
    name: `vite-${version}`,
    outDir: 'dist',
    page: { file: 'index.html', preload: (file: string) => new RegExp(`^/assets/${file}-[\\w-]+\\.ttf$`) },
    fallback: version === 8,
  })),
  ...['vitepress', 'vitepress-2'].map(name => ({
    name,
    outDir: '.vitepress/dist',
    page: { file: 'index.html', preload: (file: string) => new RegExp(`^/unplugin-fonts/assets/fonts/${file}\\.ttf$`) },
  })),
  ...[2, 3, 4, 5].map(version => ({
    name: `astro-${version}`,
    outDir: 'dist',
    page: { file: 'index.html', preload: (file: string) => new RegExp(`^/assets/fonts/${file}\\.ttf$`) },
  })),
  { name: 'nuxt', outDir: '.output/public', serverDir: '.output/server/chunks' },
  { name: 'sveltekit', outDir: '.svelte-kit/output/client' },
]

/** Contents of every file under `dir` ending with one of `extensions`. */
function readAll(dir: string, extensions: string[]) {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter(file => extensions.some(extension => file.endsWith(extension)))
    .map(file => readFileSync(join(dir, file), 'utf8'))
    .join('\n')
}

describe.each(examples)('$name', ({ name, outDir, page, serverDir, fallback }) => {
  const output = join(examplesDir, name, outDir)

  it('is built', () => {
    expect(existsSync(output), `run \`pnpm --filter "./examples/*" run build\` first`).toBe(true)
  })

  it('emits the custom @font-face rules', () => {
    expect(readAll(output, ['.css', '.html'])).toMatch(/@font-face\s*\{[^}]*font-family:\s*["']?Dancing Script["']?\s*;/)
  })

  it.runIf(page)('links fonts in the page head', () => {
    const html = readFileSync(join(output, page!.file), 'utf8')
    const fontLinks = fontLinkHrefs(html)

    // Each Dancing Script file linked exactly once: none missing, none duplicated.
    const files = ['Regular', 'Medium', 'SemiBold', 'Bold'].map(weight => `DancingScript-${weight}`)
    expect(fontLinks).toHaveLength(files.length)
    for (const file of files)
      expect(fontLinks.filter(href => page!.preload(file).test(href)), file).toHaveLength(1)
    expect(html).toMatch(/<link[^>]+href="https:\/\/fonts\.googleapis\.com\/css2\?family=Crimson Pro/)
  })

  it.runIf(serverDir)('renders font links in the runtime head', () => {
    const server = readAll(join(examplesDir, name, serverDir!), ['.mjs'])

    expect(server).toContain('{"rel":"preload","as":"font","type":"font/ttf","href":"/fonts/DancingScript-Regular.ttf","crossorigin":"anonymous"}')
    expect(server).toContain('https://fonts.googleapis.com/css2?family=Crimson Pro')
  })

  it.runIf(fallback)('emits metric-adjusted fallbacks and appends them to font-family', () => {
    const css = readAll(output, ['.css', '.html'])

    expect(css).toMatch(/@font-face\s*\{[^}]*font-family:\s*["']?Dancing Script fallback["']?\s*;[^}]*size-adjust:/)
    expect(css).toMatch(/font-family:\s*["']?Dancing Script["']?,\s*["']?Dancing Script fallback["']?/)
  })
})
