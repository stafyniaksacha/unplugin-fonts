import type { HtmlTagDescriptor } from 'vite'
import type { CustomFonts, Options } from './types.js'
import MagicString from 'magic-string'
import { basename as _basename, extname } from 'pathe'
import { createUnplugin } from 'unplugin'
import { customVirtualModule, isPublicFontFile, joinURL, resolveFontFiles, resolveUserOption } from './loaders/custom.js'
import { collectFallbackNames, generateAllFallbacks, transformFontFamilyDeclarations } from './loaders/fallback.js'
import { fontsourceImports, fontsourceVirtualModule } from './loaders/fontsource.js'
import { applyLinkFilter, getHeadLinkTags } from './loaders/index.js'

const virtualStylesId = 'unfonts.css'
const resolvedVirtualStylesId = `\0${virtualStylesId}`

const virtualModuleId = 'unplugin-fonts/head'
const resolvedVirtualModuleId = `\0${virtualModuleId}`

const fontFileRegex = /\.(?:woff2?|ttf|eot|otf)(?:\?.*)?$/i
const fontFaceRegex = /@font-face\s*\{[^}]*\}/g

export default createUnplugin<Options | undefined>((userOptions) => {
  const options = userOptions || {}
  let root: string
  let base: string
  let vitepressInjected = false
  // A multi-page build transforms every HTML page against the same bundle: the
  // first page moves the @font-face rules out of the CSS, the others reuse them.
  const inlinedFontFaces = new WeakMap<object, string[]>()

  const fallbackNames = collectFallbackNames(options)

  return {
    name: 'unplugin-fonts',
    enforce: 'pre',
    resolveId(id) {
      if (id.startsWith(virtualStylesId))
        return resolvedVirtualStylesId

      if (id.startsWith(virtualModuleId))
        return resolvedVirtualModuleId
    },

    async load(id) {
      if (id.startsWith(resolvedVirtualModuleId)) {
        const tags = applyLinkFilter(getHeadLinkTags(options, root, base), options.custom?.linkFilter)
        const s = new MagicString(`export const links = ${JSON.stringify(tags)};\n`)

        s.append(`export const importMap = ${JSON.stringify(fontsourceImports(options.fontsource))};\n`)
        s.append(`export const styles = ${JSON.stringify(fontsourceVirtualModule(options.fontsource))};\n`)

        return {
          code: s.toString(),
          map: options.sourcemap
            ? s.generateMap({ hires: true })
            : undefined,
        }
      }

      if (id.startsWith(resolvedVirtualStylesId)) {
        const s = new MagicString('')

        if (options.fontsource)
          s.append(`${fontsourceVirtualModule(options.fontsource)}\n`)

        if (options.custom)
          s.append(`${customVirtualModule(options.custom, root)}\n`)

        if (fallbackNames.size > 0) {
          const fallbackCSS = await generateAllFallbacks(options, root)
          if (fallbackCSS)
            s.append(`${fallbackCSS}\n`)
        }

        return {
          code: s.toString(),
          map: options.sourcemap
            ? s.generateMap({ hires: true })
            : undefined,
        }
      }
    },
    transform(code, id) {
      return transformFontFamilyDeclarations(code, id, fallbackNames, !!options.sourcemap)
    },
    vite: {
      configResolved(viteConfig) {
        root = viteConfig.root
        base = viteConfig.base
      },
      generateBundle(_options, bundle) {
        if ('VITEPRESS_CONFIG' in globalThis) {
          // VitePress runs client and server builds with the same plugin instance.
          if (!vitepressInjected) {
            vitepressInjected = true
            generateVitepressBundle(options, base, root, bundle, (globalThis as any).VITEPRESS_CONFIG)
          }
          return
        }

        for (const info of Object.values(bundle)) {
          if (info.name?.endsWith('.astro') || info.name === 'pages/all') {
            // @todo inject head to astro
          }
        }
      },
      // inject head tags on vite in spa/mpa mode
      transformIndexHtml: {
        order: 'post',
        handler: (html, ctx) => {
          const tags = [
            ...getHeadLinkTags(options, root, base),
            ...bundledFontLinks(options, root, base, ctx.bundle ?? {}),
          ]
          // Inline @font-face rules from bundled CSS for faster LCP
          if (options.inlineFontFace && ctx.bundle) {
            let fontFaceRules = inlinedFontFaces.get(ctx.bundle)
            if (!fontFaceRules) {
              fontFaceRules = extractFontFaceRules(ctx.bundle)
              inlinedFontFaces.set(ctx.bundle, fontFaceRules)
            }
            if (fontFaceRules.length > 0) {
              tags.push({
                tag: 'style',
                injectTo: 'head-prepend',
                children: fontFaceRules.join(''),
              })
            }
          }

          return applyLinkFilter(tags, options.custom?.linkFilter)
        },
      },
    },
  }
})

/**
 * Move the @font-face rules of every CSS asset out of the bundle.
 */
function extractFontFaceRules(bundle: Record<string, { type: string, fileName: string, source?: unknown }>) {
  const rules: string[] = []
  for (const info of Object.values(bundle)) {
    if (info.type !== 'asset' || !info.fileName.endsWith('.css') || typeof info.source !== 'string')
      continue
    const matches = info.source.match(fontFaceRegex)
    if (matches) {
      rules.push(...matches)
      info.source = info.source.replace(fontFaceRegex, '')
    }
  }
  return rules
}

/**
 * `<link>` tags preloading the custom font files emitted in the bundle.
 */
function bundledFontLinks(options: Options, root: string, base: string, bundle: Record<string, unknown>): HtmlTagDescriptor[] {
  if (!options.custom)
    return []

  const { preload, prefetch, injectTo } = resolveUserOption(options.custom)
  if (!preload && !prefetch)
    return []

  const faces = resolveCustomFontFaces(options.custom, root)
  if (faces.size === 0)
    return []

  // One preload per face: the bundled file of its first @font-face source,
  // which is the one browsers download.
  const preferred = new Map<string, { file: string, rank: number }>()
  for (const [file, info] of Object.entries(bundle)) {
    if (!fontFileRegex.test(file))
      continue
    // Rollup 4 records `originalFileNames`, Rollup 3 (Vite 4) only the asset `name`.
    const asset = info as { originalFileNames?: string[], names?: string[], name?: string }
    for (const source of asset.originalFileNames ?? asset.names ?? (asset.name ? [asset.name] : [])) {
      const ext = extname(source)
      const basename = _basename(source, ext)
      const extensions = faces.get(basename)
      if (!extensions)
        continue
      const rank = extensions.includes(ext) ? extensions.indexOf(ext) : extensions.length
      const current = preferred.get(basename)
      if (!current || rank < current.rank)
        preferred.set(basename, { file, rank })
    }
  }

  return [...preferred.values()]
    .map(({ file }) => ({
      tag: 'link',
      injectTo,
      attrs: {
        rel: prefetch ? 'prefetch' : 'preload',
        as: 'font',
        type: `font/${extname(file).replace('.', '')}`,
        href: joinURL(base, file),
        crossorigin: 'anonymous',
      },
    }))
}

/**
 * Extensions of each custom font face in `@font-face` source order, keyed by basename.
 */
function resolveCustomFontFaces(customOptions: CustomFonts | undefined, root: string): Map<string, string[]> {
  if (!customOptions)
    return new Map()
  const resolved = resolveUserOption(customOptions)
  const faces = new Map<string, string[]>()
  for (const family of resolved.families) {
    for (const face of resolveFontFiles(family, resolved, root)) {
      // Faces whose first source is public are linked by customLoader instead.
      const [first] = face.files
      if (first && !isPublicFontFile(first.src, resolved, root))
        faces.set(face.basename, face.files.map(file => file.ext))
    }
  }
  return faces
}

function generateVitepressBundle(
  options: Options,
  base: string,
  root: string,
  bundle: any,
  vitepressConfig: any,
) {
  const tags = applyLinkFilter([
    ...getHeadLinkTags(options, root, base),
    ...bundledFontLinks(options, root, base, bundle ?? {}),
  ], options.custom?.linkFilter)

  for (const tag of tags) {
    vitepressConfig?.site?.head?.push([
      tag.tag,
      tag.attrs?.onload === 'this.rel=\'stylesheet\''
        ? {
            rel: 'stylesheet',
            href: tag.attrs?.href,
          }
        : tag.attrs,
    ])
  }
}
