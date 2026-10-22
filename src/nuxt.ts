import type {} from '@nuxt/schema'
import type { Options } from './types.js'
import { addTemplate, addVitePlugin, addWebpackPlugin, defineNuxtModule } from '@nuxt/kit'
import unplugin from './index.js'
import { customVirtualModule } from './loaders/custom.js'
import { generateAllFallbacks, hasFallbacks } from './loaders/fallback.js'
import { fontsourceImports } from './loaders/fontsource.js'
import { applyLinkFilter, getHeadLinkTags } from './loaders/index.js'

export default defineNuxtModule<Options>({
  meta: {
    name: 'unplugin-fonts',
    configKey: 'unfonts',
  },
  setup(options, nuxt) {
    const needsCSSTemplate = 'fontsource' in options || 'custom' in options || hasFallbacks(options)

    if (needsCSSTemplate) {
      nuxt.options.css ||= []
      if (options.fontsource) {
        for (const src of fontsourceImports(options.fontsource))
          nuxt.options.css.push(src)
      }

      nuxt.options.css.push('#build/unfonts.css')
      addTemplate({
        filename: 'unfonts.css',
        getContents: async () => {
          let css = options.custom
            ? customVirtualModule(options.custom, nuxt.options.rootDir)
            : ''
          const fallbackCSS = await generateAllFallbacks(options, nuxt.options.rootDir)
          if (fallbackCSS)
            css += `\n${fallbackCSS}`
          return css
        },
      })
    }

    // Public files are served from the app base URL.
    const links = applyLinkFilter(
      getHeadLinkTags(options, nuxt.options.rootDir, nuxt.options.app.baseURL),
      options.custom?.linkFilter,
    )

    nuxt.options.app.head ||= {}
    nuxt.options.app.head.link ||= []

    for (const link of links) {
      nuxt.options.app.head.link.push({
        ...link.attrs as any,
      })
    }

    addWebpackPlugin(unplugin.webpack(options))
    addVitePlugin(unplugin.vite(options))
  },
})
