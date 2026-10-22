import type { CssNode, Identifier, Value, WalkContext } from 'css-tree'
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
  /** Other names the font is declared under in CSS. */
  aliases?: string[]
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
      const familyName = family.name.replace(VARIABLE_SUFFIX_RE, '')
      yield {
        familyName,
        // Variable packages declare their @font-face as "<name> Variable".
        aliases: specifier?.startsWith('@fontsource-variable/') ? [`${familyName} Variable`] : [],
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

/**
 * Read metrics from the first font file referenced by an installed Fontsource stylesheet.
 * Rejects when the package is not installed.
 */
async function readFontsourceMetrics({ specifier, root }: { specifier: string, root: string }) {
  const require = createRequire(resolve(root, 'package.json'))
  const cssPath = require.resolve(specifier)
  const css = await readFile(cssPath, 'utf8')
  const source = find(parse(css), node => node.type === 'Url')
  return source?.type === 'Url'
    ? readMetrics(new URL(source.value, pathToFileURL(cssPath)))
    : null
}

async function generateFallbackForFamily(params: FallbackEntry): Promise<string> {
  const { familyName, config, fontFilePath, fontsourceCSS } = params

  let metrics = await getMetricsForFamily(familyName)
  if (!metrics && fontsourceCSS) {
    metrics = await readFontsourceMetrics(fontsourceCSS).catch(() => null)
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

  for (const { familyName, aliases = [], config } of iterateFallbackFamilies(options, resolvedCustom)) {
    const fallbackName = config.name ?? generateFallbackName(familyName)
    for (const name of [familyName, ...aliases])
      map.set(name, fallbackName)
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

  // Family names are ASCII case-insensitive in CSS.
  const lookup = new Map([...fallbackNames].map(([family, fallback]) => [family.toLowerCase(), fallback]))
  const s = new MagicString(code)
  appendFallbacks(s, code, 0, lookup)

  if (!s.hasChanged())
    return undefined

  return {
    code: s.toString(),
    map: sourcemap
      ? s.generateMap({ source: id, includeContent: true })
      : undefined,
  }
}

/**
 * Parse `css`, found at `offset` in the original source, and append fallback names
 * to its font declarations. css-tree keeps nested rules without `&` (`.a { .b {} }`)
 * as raw block content, so those are parsed recursively.
 */
function appendFallbacks(s: MagicString, css: string, offset: number, lookup: Map<string, string>) {
  walk(parse(css, { positions: true, offset }), {
    enter(this: WalkContext, node: CssNode) {
      if (this.atrule?.name === 'font-face')
        return

      if (node.type === 'Raw' && this.block && !this.declaration && node.value.includes('{')) {
        appendFallbacks(s, node.value, node.loc!.start.offset, lookup)
        return
      }

      if (node.type !== 'Declaration' || (node.property !== 'font-family' && node.property !== 'font'))
        return
      if (node.value.type !== 'Value')
        return

      const families = familyNames(node.value)
      const listed = new Set(families.map(family => family.name.toLowerCase()))

      for (const family of families) {
        const fallbackName = findFallback(family, lookup, node.property === 'font')
        if (!fallbackName || listed.has(fallbackName.toLowerCase()))
          continue

        listed.add(fallbackName.toLowerCase())
        s.appendRight(family.end, `, "${fallbackName}"`)
      }
    },
  })
}

/**
 * The fallback name for a candidate family. In the `font` shorthand, keywords such
 * as `normal` or `medium` can precede the first family in the same identifier run,
 * so the words of an unquoted name are also tried from the end
 * (`medium Open Sans` → `Open Sans`).
 */
function findFallback(family: FamilyName, lookup: Map<string, string>, shorthand: boolean) {
  const words = family.quoted ? [family.name] : family.name.split(' ')
  const starts = shorthand && !family.quoted ? [...words.keys()] : [0]

  for (const start of starts) {
    const name = words.slice(start).join(' ').toLowerCase()
    if (!family.quoted && GENERIC_FAMILIES.has(name))
      return undefined
    const fallbackName = lookup.get(name)
    if (fallbackName)
      return fallbackName
  }

  return undefined
}

interface FamilyName {
  name: string
  quoted: boolean
  /** Offset where the name ends in the source. */
  end: number
}

/**
 * Candidate family names in a `font` / `font-family` value: quoted strings, and
 * runs of identifiers such as `Open Sans`, with the offset where each one ends.
 */
function familyNames(value: Value) {
  const families: FamilyName[] = []
  let run: Identifier[] = []

  const flush = () => {
    const last = run.at(-1)
    if (last)
      families.push({ name: run.map(node => node.name).join(' '), quoted: false, end: last.loc!.end.offset })
    run = []
  }

  for (const child of value.children) {
    if (child.type === 'Identifier') {
      run.push(child)
      continue
    }
    flush()
    if (child.type === 'String')
      families.push({ name: child.value, quoted: true, end: child.loc!.end.offset })
  }
  flush()

  return families
}
