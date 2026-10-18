import type { AstroIntegration } from 'astro'
import type { Options } from './types.js'
import unplugin from './index.js'

export default function (options: Options) {
  return <AstroIntegration>{
    name: 'unplugin-fonts',
    hooks: {
      'astro:config:setup': async (astro) => {
        if (options?.custom)
          options.custom.stripPrefix = 'public/'

        astro.config.vite.plugins ||= []
        astro.config.vite.plugins.push(unplugin.vite(options) as any)

        astro.injectScript('page-ssr', 'import "unfonts.css";')
      },
    },
  }
}
