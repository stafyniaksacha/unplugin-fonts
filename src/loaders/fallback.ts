import type { CustomFontFamily, FontFallbackConfig, Options } from '../types.js'
import type { ResolvedCustomFonts } from './custom.js'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { find, parse, walk } from 'css-tree'
import {
  generateFallbackName,
  generateFontFace,
  getMetricsForFamily,
  readMetrics,
  resolveCategoryFallbacks,
} from 'fontaine'
import MagicString from 'magic-string'
import { resolveFontFiles, resolveUserOption } from './custom.js'
import { fontsourceImports } from './fontsource.js'

const VARIABLE_SUFFIX_RE = /(?: Variable|-variable)$/
const CSS_RE = /\.(?:css|scss|sass|less|styl|stylus|pcss|postcss)(?:\?.*)?$/
const GENERIC_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'emoji',
  'math',
  'fangsong',
  'inherit',
  'initial',
  'unset',
  'revert',
])

interface FallbackEntry {
  familyName: string
  config: FontFallbackConfig
  fontFilePath?: string | undefined
  fontsourceCSS?: { specifier: string, root: string } | undefined
}

/**
 * Yields all font families across loaders that have fallback configured.
 * Single iteration point — hasFallbacks, collectFallbackNames, and
 * generateAllFallbacks all consume this.
 */
function* iterateFallbackFamilies(
  options: Options,
  resolvedCustom?: ResolvedCustomFonts,
  root?: string,
): Generator<FallbackEntry> {
  if (options.custom && resolvedCustom) {
    for (const family of resolvedCustom.families) {
      if (!family.fallback)
        continue
      yield {
        familyName: family.name,
        config: family.fallback,
        fontFilePath: root ? findRepresentativeFontFile(family, resolvedCustom, root) : undefined,
      }
    }
  }

  if (options.google) {
    for (const family of options.google.families) {
      if (typeof family === 'string' || !family.fallback)
        continue
      yield { familyName: family.name, config: family.fallback }
    }
  }

  if (options.fontsource) {
    for (const family of options.fontsource.families) {
      if (!family || typeof family === 'string' || !family.fallback)
        continue
      const specifier = fontsourceImports({ families: [family] })[0]
      yield {
        familyName: family.name.replace(VARIABLE_SUFFIX_RE, ''),
        config: family.fallback,
        fontsourceCSS: root && specifier ? { specifier, root } : undefined,
      }
    }
  }

  if (options.typekit?.families) {
    for (const family of options.typekit.families) {
      if (typeof family === 'string' || !family.fallback)
        continue
      yield { familyName: family.name, config: family.fallback }
    }
  }
}

/**
 * Find a representative font file to read metrics from.
 * Prefers regular (400) weight, then .ttf/.woff2 formats.
 */
function findRepresentativeFontFile(
  family: CustomFontFamily,
  resolvedOptions: ResolvedCustomFonts,
  root: string,
): string | undefined {
  const faces = resolveFontFiles(family, resolvedOptions, root)
  const regularFace = faces.find(f => f.weight === 400) ?? faces[0]
  if (!regularFace)
    return undefined

  const preferredOrder = ['.ttf', '.woff2', '.woff', '.otf']
  for (const ext of preferredOrder) {
    const file = regularFace.files.find(f => f.ext === ext)
    if (file)
      return file.src
  }

  return regularFace.files[0]?.src
}

async function generateFallbackForFamily(params: FallbackEntry): Promise<string> {
  const { familyName, config, fontFilePath, fontsourceCSS } = params

  let metrics = await getMetricsForFamily(familyName)
  if (!metrics && fontsourceCSS) {
    const require = createRequire(resolve(fontsourceCSS.root, 'package.json'))
    const cssPath = require.resolve(fontsourceCSS.specifier)
    const css = await readFile(cssPath, 'utf8')
    const source = find(parse(css), node => node.type === 'Url')
    if (source?.type === 'Url') {
      metrics = await readMetrics(new URL(source.value, pathToFileURL(cssPath)))
    }
  }
  if (!metrics && fontFilePath) {
    metrics = await readMetrics(pathToFileURL(fontFilePath)).catch(() => null)
  }

  if (!metrics) {
    console.warn(
      `unplugin-fonts: Could not resolve metrics for "${familyName}", skipping fallback generation`,
    )
    return ''
  }

  const systemFonts = config.fallbacks
    ?? resolveCategoryFallbacks({
      fontFamily: familyName,
      fallbacks: {},
      metrics: config.category
        ? { ...metrics, category: config.category }
        : metrics,
    })

  const fallbackName = config.name ?? generateFallbackName(familyName)

  // Fetch all system font metrics concurrently
  const systemMetricsList = await Promise.all(
    systemFonts.map(font => getMetricsForFamily(font)),
  )

  const css: string[] = []
  for (const [i, font] of systemFonts.entries()) {
    const systemMetrics = systemMetricsList[i]
    if (!systemMetrics)
      continue
    css.push(generateFontFace(metrics, {
      name: fallbackName,
      font,
      metrics: systemMetrics,
    }))
  }

  return css.join('')
}

export function hasFallbacks(options: Options): boolean {
  const resolvedCustom = options.custom ? resolveUserOption(options.custom) : undefined
  // Check if the generator yields at least one entry
  return !iterateFallbackFamilies(options, resolvedCustom).next().done
}

/**
 * Generate fallback CSS for all font families that have opted in.
 */
export async function generateAllFallbacks(
  options: Options,
  root: string,
): Promise<string> {
  const resolvedCustom = options.custom ? resolveUserOption(options.custom) : undefined
  // Collect all entries from the generator to run them concurrently
  const entries = [...iterateFallbackFamilies(options, resolvedCustom, root)]

  const results = await Promise.all(
    entries.map(entry => generateFallbackForFamily(entry)),
  )

  return results.filter(Boolean).join('')
}

/**
 * Build a map of font family name → fallback name for all fonts
 * that have fallback configured. Used by the transform hook.
 */
export function collectFallbackNames(options: Options): Map<string, string> {
  const resolvedCustom = options.custom ? resolveUserOption(options.custom) : undefined
  const map = new Map<string, string>()

  for (const { familyName, config } of iterateFallbackFamilies(options, resolvedCustom)) {
    map.set(familyName, config.name ?? generateFallbackName(familyName))
  }

  return map
}

/**
 * Transform CSS to append fallback font names to font-family declarations.
 * Only modifies declarations that reference a font with fallback configured.
 */
export function transformFontFamilyDeclarations(
  code: string,
  id: string,
  fallbackNames: Map<string, string>,
  sourcemap?: boolean,
): { code: string, map?: any } | undefined {
  if (!CSS_RE.test(id))
    return undefined
  if (fallbackNames.size === 0)
    return undefined

  const s = new MagicString(code)
  const ast = parse(code, { positions: true })

  walk(ast, {
    visit: 'Declaration',
    enter(node) {
      if (node.property !== 'font-family' && node.property !== 'font')
        return
      if (this.atrule && this.atrule.name === 'font-face')
        return
      if (node.value.type !== 'Value')
        return

      for (const child of node.value.children) {
        let family: string | undefined

        if (child.type === 'String') {
          family = child.value
        }
        else if (child.type === 'Identifier' && !GENERIC_FAMILIES.has(child.name)) {
          family = child.name
        }

        if (!family)
          continue

        const fallbackName = fallbackNames.get(family)
        if (!fallbackName)
          continue

        s.appendRight(child.loc!.end.offset, `, "${fallbackName}"`)
      }
    },
  })

  if (!s.hasChanged())
    return undefined

  return {
    code: s.toString(),
    map: sourcemap
      ? s.generateMap({ source: id, includeContent: true })
      : undefined,
  }
}
