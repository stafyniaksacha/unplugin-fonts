import type { HtmlTagDescriptor } from 'vite'
import type { CustomFonts, Options } from './types.js'
import MagicString from 'magic-string'
import { basename as _basename, extname, join } from 'pathe'
import { createUnplugin } from 'unplugin'
import { customVirtualModule, resolveFontFiles, resolveUserOption } from './loaders/custom.js'
import { collectFallbackNames, generateAllFallbacks, transformFontFamilyDeclarations } from './loaders/fallback.js'
import { fontsourceImports, fontsourceVirtualModule } from './loaders/fontsource.js'
import { getHeadLinkTags } from './loaders/index.js'

const virtualStylesId = 'unfonts.css'
const resolvedVirtualStylesId = `\0${virtualStylesId}`

const virtualModuleId = 'unplugin-fonts/head'
const resolvedVirtualModuleId = `\0${virtualModuleId}`

const fontFileRegex = /\.(?:woff2?|ttf|eot|otf)(?:\?.*)?$/i

export default createUnplugin<Options | undefined>((userOptions) => {
  const options = userOptions || {}
  let root: string
  let base: string

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
        const tags = getHeadLinkTags(options)
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
          generateVitepressBundle(options, base, root, bundle, (globalThis as any).VITEPRESS_CONFIG)
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
            ...getHeadLinkTags(options),
            ...bundledFontLinks(options, root, base, ctx.bundle ?? {}),
          ]
          // Inline @font-face rules from bundled CSS for faster LCP
          if (options.inlineFontFace) {
            const fontFaceRegex = /@font-face\s*\{[^}]*\}/g
            const fontFaceRules: string[] = []
            for (const info of Object.values(ctx.bundle ?? {})) {
              if (info.type === 'asset' && typeof info.fileName === 'string' && info.fileName.endsWith('.css')) {
                const css = typeof info.source === 'string' ? info.source : ''
                const matches = css.match(fontFaceRegex)
                if (matches) {
                  fontFaceRules.push(...matches)
                  info.source = css.replace(fontFaceRegex, '')
                }
              }
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

let vitepressInjected = false

/**
 * `<link>` tags preloading the custom font files emitted in the bundle.
 */
function bundledFontLinks(options: Options, root: string, base: string, bundle: Record<string, unknown>): HtmlTagDescriptor[] {
  const customBasenames = resolveCustomFontBasenames(options.custom, root)
  if (customBasenames.size === 0)
    return []

  const { prefetch: wantPrefetch, preload: wantPreload } = options.custom || {}
  if (!(
    wantPrefetch === true || wantPreload === true
    || (wantPrefetch === undefined && wantPreload === undefined)
  )) {
    return []
  }

  return Object.entries(bundle)
    .filter(([key, info]) => {
      if (!fontFileRegex.test(key))
        return false
      const asset = info as { originalFileNames?: string[] }
      return (asset.originalFileNames ?? []).some((name) => {
        return customBasenames.has(_basename(name, extname(name)))
      })
    })
    .map(([file]) => ({
      tag: 'link',
      injectTo: options.custom?.injectTo ?? 'head-prepend',
      attrs: {
        rel: options.custom?.prefetch ? 'prefetch' : 'preload',
        as: 'font',
        type: `font/${extname(file).replace('.', '')}`,
        href: join(base, file),
        crossorigin: 'anonymous',
      },
    }))
}

/**
 * Apply the user's `linkFilter`: an array replaces the tags, a boolean keeps or drops them all.
 */
function applyLinkFilter(tags: HtmlTagDescriptor[], linkFilter: CustomFonts['linkFilter']) {
  if (!linkFilter)
    return tags

  const filtered = linkFilter(tags)
  if (Array.isArray(filtered))
    return filtered

  return filtered ? tags : []
}

function resolveCustomFontBasenames(customOptions: CustomFonts | undefined, root: string): Set<string> {
  if (!customOptions)
    return new Set()
  const resolved = resolveUserOption(customOptions)
  const basenames = new Set<string>()
  for (const family of resolved.families) {
    for (const face of resolveFontFiles(family, resolved, root))
      basenames.add(face.basename)
  }
  return basenames
}

function generateVitepressBundle(
  options: Options,
  base: string,
  root: string,
  bundle: any,
  vitepressConfig: any,
) {
  if (vitepressInjected)
    return
  vitepressInjected = true

  const tags = applyLinkFilter([
    ...getHeadLinkTags(options),
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
