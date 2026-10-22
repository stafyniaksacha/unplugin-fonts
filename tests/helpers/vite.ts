import type { UnpluginContextMeta } from 'unplugin'
import type { HtmlTagDescriptor } from 'vite'
import type { Options } from '../../src/types.js'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import plugin from '../../src/index.js'
import Unfonts from '../../src/vite.js'

type ViteModule = typeof import('vite')
type BuildOutput = Extract<Awaited<ReturnType<ViteModule['build']>>, { output: unknown }>

/**
 * The plugin hooks the tests call directly, without a bundler context.
 */
export interface RawPlugin {
  resolveId: (id: string) => string | undefined
  load: (id: string) => Promise<{ code: string, map?: { mappings: string } | undefined } | undefined>
  transform: (code: string, id: string) => { code: string, map?: unknown } | undefined
  vite: {
    configResolved: (config: { root: string, base: string }) => void
    generateBundle: (options: unknown, bundle: Record<string, unknown>) => void
    transformIndexHtml: {
      handler: (html: string, ctx: { bundle?: Record<string, unknown> | undefined }) => HtmlTagDescriptor[]
    }
  }
}

/**
 * Instantiate the plugin for a bundler. unplugin types its hooks for each bundler's
 * context; the tests call them directly, so this is the one place that narrows them.
 */
export function rawPlugin(options: Options, meta: UnpluginContextMeta): RawPlugin {
  return plugin.raw(options, meta) as unknown as RawPlugin
}

/**
 * Instantiate the plugin as Vite would, with `configResolved` already called.
 */
export function getVitePlugin(options: Options = {}, { root = '/root', base = '/' } = {}) {
  const p = rawPlugin(options, { framework: 'vite', versions: {} })
  p.vite.configResolved({ root, base })
  return p
}

export function callTransformIndexHtml(p: RawPlugin, bundle?: Record<string, unknown>) {
  return p.vite.transformIndexHtml.handler('', { bundle })
}

/**
 * Resolve and load a virtual module (`unfonts.css`, `unplugin-fonts/head`, or an
 * already resolved id), failing the test if the plugin does not handle it.
 */
export async function loadModule(p: RawPlugin, id: string) {
  const result = await p.load(p.resolveId(id) ?? id)
  if (!result)
    throw new Error(`unplugin-fonts did not load ${id}`)
  return result
}

export interface FixtureOptions {
  /** Files written in the fixture root, keyed by path relative to it. */
  files: Record<string, string | Uint8Array>
  options: Options
  base?: string
  /** HTML entry points relative to the root. Defaults to Vite's `index.html`. */
  input?: string[]
  /** Vite module to build with, to run the same fixture against other installed versions. */
  vite?: ViteModule
}

export interface FixtureOutput {
  /** Emitted HTML pages keyed by file name. */
  html: Record<string, string>
  /** All emitted CSS assets, concatenated. */
  css: string
  /** File names of every emitted asset and chunk. */
  files: string[]
}

const testsDir = fileURLToPath(new URL('..', import.meta.url))

/**
 * Run a real `vite build` (without writing to disk) on a throwaway project.
 */
export async function buildFixture({ files, options, base = '/', input, vite }: FixtureOptions): Promise<FixtureOutput> {
  // Created under tests/ so packages such as @fontsource/* resolve from the repository's node_modules.
  const root = await mkdtemp(join(testsDir, '.fixture-'))
  try {
    for (const [file, content] of Object.entries(files)) {
      await mkdir(dirname(join(root, file)), { recursive: true })
      await writeFile(join(root, file), content)
    }

    const { build } = vite ?? await import('vite')
    const result = await build({
      root,
      base,
      configFile: false,
      logLevel: 'silent',
      plugins: [Unfonts(options)],
      build: {
        write: false,
        minify: false,
        cssMinify: false,
        ...(input && { rollupOptions: { input: input.map(file => join(root, file)) } }),
      },
    })

    const outputs = (Array.isArray(result) ? result : [result]) as BuildOutput[]
    const emitted = outputs.flatMap(output => output.output)
    const assetSource = (source: string | Uint8Array) => typeof source === 'string' ? source : new TextDecoder().decode(source)
    const assets = emitted.filter(output => output.type === 'asset')

    return {
      html: Object.fromEntries(assets
        .filter(asset => asset.fileName.endsWith('.html'))
        .map(asset => [asset.fileName, assetSource(asset.source)])),
      css: assets
        .filter(asset => asset.fileName.endsWith('.css'))
        .map(asset => assetSource(asset.source))
        .join('\n'),
      files: emitted.map(output => output.fileName),
    }
  }
  finally {
    await rm(root, { recursive: true, force: true })
  }
}
