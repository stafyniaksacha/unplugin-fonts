import type { HtmlTagDescriptor } from 'vite'
import type { CustomFontFace, CustomFontFamily, CustomFonts } from '../types.js'
import { basename as _basename, extname, join, relative } from 'pathe'
import { globSync } from 'tinyglobby'

export type ResolvedCustomFonts = Required<Omit<CustomFonts, 'families' | 'linkFilter'>> & { families: CustomFontFamily[], linkFilter?: CustomFonts['linkFilter'] }

export function resolveUserOption(options: CustomFonts): ResolvedCustomFonts {
  let {
    families = [],
    preload = true,
    prefetchPrefix = '',
    prefetch = false,
    injectTo = 'head-prepend',
    display = 'auto',
    stripPrefix = 'public/',
    linkFilter,
  } = options

  // --- Cast as array of `CustomFontFamily`.
  if (!Array.isArray(families)) {
    families = Object.entries(families)
      .map(([name, family]) => (Array.isArray(family) || typeof family === 'string')
        ? { name, src: family }
        : { name, ...family },
      )
  }

  return {
    families,
    preload,
    prefetchPrefix,
    prefetch,
    injectTo,
    display,
    stripPrefix: normalizeDirectoryPrefix(stripPrefix),
    linkFilter,
  }
}

/**
 * `public`, `./public` or `public\` → `public/`, so the prefix only matches whole
 * directories of the root-relative (forward slash) font paths.
 */
function normalizeDirectoryPrefix(prefix: string) {
  const normalized = prefix.replace(/\\/g, '/').replace(/^\.\//, '')
  return normalized && !normalized.endsWith('/') ? `${normalized}/` : normalized
}

/**
 * Join a URL prefix (`/`, `/sub`, `./` or `https://cdn.example.com/`) and a path.
 * Unlike a filesystem join, it keeps `scheme://` intact.
 */
export function joinURL(base: string, path: string) {
  if (!base)
    return path
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

export function customVirtualModule(userOptions: CustomFonts, root: string) {
  const options = resolveUserOption(userOptions)

  const css: string[] = []

  for (const family of options.families) {
    const faces = resolveFontFiles(family, options, root)

    // --- Generate CSS `@font-face` rules.
    for (const face of faces)
      css.push(generateFontCSS(face))
  }

  return css.join('\n')
}

/**
 * Whether a font file is served as-is from the public directory, i.e. its path
 * relative to the root starts with `stripPrefix`. Other files go through the bundler.
 */
export function isPublicFontFile(file: string, options: ResolvedCustomFonts, root: string) {
  return relative(root, file).startsWith(options.stripPrefix)
}

const warnedPreloadAndPrefetch = new WeakSet<CustomFonts>()

/**
 * `<link>` tags preloading the custom fonts served from the public directory.
 * Bundled fonts get hashed file names, so they are linked once the bundle is known.
 */
export function customLoader(userOptions: CustomFonts, root: string, base = '/') {
  const options = resolveUserOption(userOptions)

  // --- We can not do a prefetch and a preload for the same files.
  // Links are generated for every page (and every dev request): warn once per configuration.
  if (options.preload && options.prefetch && !warnedPreloadAndPrefetch.has(userOptions)) {
    warnedPreloadAndPrefetch.add(userOptions)
    console.warn('unplugin-fonts: Prefetch and a Preload options can not be used together.\n'
      + 'unplugin-fonts: The prefetch stand for a lower priority for the resource (maybe we will need it in a future page) whereas preload is for the current page, so we can not have both.')
  }
  if (!options.preload && !options.prefetch)
    return []

  const tags: HtmlTagDescriptor[] = []

  // --- Iterate over font families and their faces.
  for (const family of options.families) {
    for (const face of resolveFontFiles(family, options, root))
      tags.push(...createFontLinks(options, face, root, base))
  }

  return tags
}

export function resolveFontFiles(family: CustomFontFamily, options: ResolvedCustomFonts, root: string) {
  const sources = Array.isArray(family.src) ? family.src : [family.src]
  const facesMap: Record<string, CustomFontFace> = {}

  for (const source of sources) {
    const results = globSync(source, { absolute: true, cwd: root, onlyFiles: true })

    for (const file of results) {
      const ext = extname(file)
      const basename = _basename(file, ext)

      let format = ''
      switch (ext) {
        case '.woff':
          format = 'woff'
          break
        case '.woff2':
          format = 'woff2'
          break
        case '.ttf':
          format = 'truetype'
          break
        case '.otf':
          format = 'opentype'
          break
        case '.svg':
          format = 'svg'
          break
        case '.eot':
          format = 'embedded-opentype'
          break
        default:
          format = ext.replace('.', '')
      }

      const face = facesMap[basename] ||= {
        source,
        name: family.name,
        basename,
        weight: extractWeight(basename),
        style: extractStyle(basename),
        local: family.local,
        display: options.display,
        files: [],
      }
      const relativePath = relative(root, file)
      face.files.push({
        src: file,
        path: join('/', relativePath.startsWith(options.stripPrefix)
          ? relativePath.slice(options.stripPrefix.length)
          : relativePath),
        format,
        ext,
      })
    }
  }

  const faces: CustomFontFace[] = []
  for (const face of Object.values(facesMap)) {
    // Browsers use the first source they support: put the smallest formats first.
    face.files.sort((a, b) => formatRank(a.ext) - formatRank(b.ext))

    if (!family.transform) {
      faces.push(face)
      continue
    }

    const transformed = family.transform(face)
    if (transformed)
      faces.push(transformed)
  }

  return faces
}

function extractWeight(filename?: string) {
  if (!filename)
    return 400

  filename = filename.toLowerCase()

  if (filename.includes('thin'))
    return 100
  if (filename.includes('extralight'))
    return 200
  if (filename.includes('ultralight'))
    return 200
  if (filename.includes('light'))
    return 300
  if (filename.includes('normal'))
    return 400
  if (filename.includes('medium'))
    return 500
  if (filename.includes('semibold'))
    return 600
  if (filename.includes('demibold'))
    return 600
  if (filename.includes('extrabold'))
    return 800
  if (filename.includes('ultrabold'))
    return 800
  if (filename.includes('bold'))
    return 700
  if (filename.includes('black'))
    return 900
  if (filename.includes('heavy'))
    return 900
  return 400
}

function extractStyle(filename?: string) {
  if (!filename)
    return 'normal'

  filename = filename.toLowerCase()
  if (filename.includes('normal'))
    return 'normal'

  if (filename.includes('italic'))
    return 'italic'

  if (filename.includes('oblique'))
    return 'oblique'

  return 'normal'
}

const FORMAT_PRIORITY = ['.woff2', '.woff', '.ttf', '.otf']

function formatRank(ext: string) {
  const rank = FORMAT_PRIORITY.indexOf(ext)
  return rank === -1 ? FORMAT_PRIORITY.length : rank
}

function cssString(value: string) {
  return `'${value.replace(/[\\']/g, '\\$&')}'`
}

function generateFontCSS(face: CustomFontFace) {
  // --- Format local, listed first so an installed font is used before downloading.
  const locals = (Array.isArray(face.local) ? face.local : [face.local])
    .filter((name): name is string => Boolean(name))
    .map(name => `local(${cssString(name)})`)

  // --- Format sources.
  const urls = face.files
    .map(file => `url(${cssString(file.path)}) format('${file.format}')`)

  // --- Return CSS rule as string.
  return [
    '@font-face {',
    `  font-family: ${cssString(face.name)};`,
    `  src: ${[...locals, ...urls].join(',\n\t\t')};`,
    `  font-weight: ${face.weight};`,
    `  font-style: ${face.style};`,
    `  font-display: ${face.display};`,
    '}',
  ].join('\n')
}

function createFontLinks(options: ResolvedCustomFonts, face: CustomFontFace, root: string, base: string): HtmlTagDescriptor[] {
  // One preload per face: its first @font-face source, which is the one browsers
  // download. Faces whose first source is bundled are linked from the bundle.
  const [file] = face.files
  if (!file || !isPublicFontFile(file.src, options, root))
    return []

  return [{
    tag: 'link',
    injectTo: options.injectTo,
    attrs: {
      rel: options.prefetch ? 'prefetch' : 'preload',
      as: 'font',
      type: `font/${file.ext.replace('.', '')}`,
      href: joinURL(options.prefetchPrefix || base, file.path),
      crossorigin: 'anonymous',
    },
  }]
}
