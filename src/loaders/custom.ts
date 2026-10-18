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
    stripPrefix,
    linkFilter,
  }
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

export function customLoader(userOptions: CustomFonts, root: string) {
  const options = resolveUserOption(userOptions)

  const tags: HtmlTagDescriptor[] = []

  // --- Iterate over font families and their faces.
  for (const family of options.families) {
    const faces = resolveFontFiles(family, options, root)

    // --- We can not do a prefetch and a preload for the same files.
    if (options.preload && options.prefetch) {
      console.warn('unplugin-fonts: Prefetch and a Preload options can not be used together.')
      console.warn('unplugin-fonts: The prefetch stand for a lower priority for the resource (maybe we will need it in a future page) whereas preload is for the current page, so we can not have both.')
    }
    if (options.preload || options.prefetch) {
      // --- Generate `<link>` tags.
      for (const face of faces)
        tags.push(...createFontLinks(options, face))
    }
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
      face.files.push({
        src: file,
        path: join('/', relative(root, file.replace(options.stripPrefix, ''))),
        format,
        ext,
      })
    }
  }

  const faces: CustomFontFace[] = []
  for (const face of Object.values(facesMap)) {
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

function generateFontCSS(face: CustomFontFace) {
  // --- Format sources.
  const srcs = face.files
    .map((file) => {
      return `url('${file.path}') format('${file.format}')`
    })
    .join(',\n\t\t')

  // --- Format local.
  const locals = (Array.isArray(face.local) ? face.local : [face.local])
    .filter(Boolean)
    .map(x => `local('${x}')`)
    .join(', ')

  // --- Return CSS rule as string.
  return [
    '@font-face {',
    `  font-family: '${face.name}';`,
    `  src: ${[srcs, locals].filter(Boolean).join(',')};`,
    `  font-weight: ${face.weight};`,
    `  font-style: ${face.style};`,
    `  font-display: ${face.display};`,
    '}',
  ].join('\n')
}

function createFontLinks(options: ResolvedCustomFonts, face: CustomFontFace) {
  const links: HtmlTagDescriptor[] = []

  for (const file of face.files) {
    links.push({
      tag: 'link',
      injectTo: options.injectTo,
      attrs: {
        rel: options.prefetch ? 'prefetch' : 'preload',
        as: 'font',
        type: `font/${file.ext.replace('.', '')}`,
        href: join(options.prefetchPrefix, file.path),
        crossorigin: true,
      },
    })
  }
  return links
}
