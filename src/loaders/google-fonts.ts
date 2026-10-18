import type { HtmlTagDescriptor } from 'vite'
import type { GoogleFonts } from '../types.js'

export function googleLoader({
  families,
  text,
  preconnect = true,
  display = 'swap',
  injectTo = 'head-prepend',
  fontBaseUrl = 'https://fonts.googleapis.com/css2',
  preconnectUrl = 'https://fonts.gstatic.com/',
}: GoogleFonts): HtmlTagDescriptor[] {
  const specs: string[] = []
  const deferedSpecs: string[] = []
  const tags: HtmlTagDescriptor[] = []

  if (!Array.isArray(families)) {
    console.warn('Google font families is required')

    return tags
  }

  if (families.length >= 0) {
    for (const family of families) {
      if (typeof family === 'string') {
        deferedSpecs.push(family)
        continue
      }

      if (!family)
        continue

      const {
        name,
        styles,
        defer = true,
      } = family

      if (!name) {
        console.warn('A google font family name is missing')
        continue
      }

      let spec = name

      if (typeof styles === 'string')
        spec += `:${styles}`

      if (defer)
        deferedSpecs.push(spec)
      else
        specs.push(spec)
    }
  }

  // warm up the fonts’ origin
  if (preconnect && specs.length + deferedSpecs.length > 0) {
    tags.push({
      tag: 'link',
      injectTo,
      attrs: {
        rel: 'preconnect',
        href: preconnectUrl,
        crossorigin: 'anonymous',
      },
    })
  }

  // defer loading font-faces definitions
  // @see https://web.dev/optimize-lcp/#defer-non-critical-css
  if (deferedSpecs.length > 0) {
    let href = `${fontBaseUrl}?family=${deferedSpecs.join('&family=')}`

    if (typeof display === 'string' && display !== 'auto')
      href += `&display=${display}`

    if (typeof text === 'string' && text.length > 0)
      href += `&text=${encodeURIComponent(text)}`

    tags.push({
      tag: 'link',
      injectTo,
      attrs: {
        rel: 'preload',
        as: 'style',
        onload: 'this.rel=\'stylesheet\'',
        href,
      },
    })
  }

  // load critical fonts
  if (specs.length > 0) {
    let href = `${fontBaseUrl}?family=${specs.join('&family=')}`

    if (typeof display === 'string' && display !== 'auto')
      href += `&display=${display}`

    if (typeof text === 'string' && text.length > 0)
      href += `&text=${encodeURIComponent(text)}`

    tags.push({
      tag: 'link',
      injectTo,
      attrs: {
        rel: 'stylesheet',
        href,
      },
    })
  }

  return tags
}
