import type { HtmlTagDescriptor } from 'vite'
import type { TypeKitFonts } from '../types.js'

export function typekitLoader({
  id,
  defer = true,
  injectTo = 'head-prepend',
  fontBaseUrl = 'https://use.typekit.net/',
}: TypeKitFonts): HtmlTagDescriptor[] {
  const tags: HtmlTagDescriptor[] = []

  if (typeof id !== 'string') {
    console.warn('A Typekit id is required')

    return tags
  }

  if (defer) {
    tags.push({
      tag: 'link',
      injectTo,
      attrs: {
        rel: 'preload',
        as: 'style',
        onload: 'this.rel=\'stylesheet\'',
        href: `${fontBaseUrl}${id}.css`,
      },
    })
  }
  else {
    tags.push({
      tag: 'link',
      injectTo,
      attrs: {
        rel: 'stylesheet',
        href: `${fontBaseUrl}${id}.css`,
      },
    })
  }

  return tags
}
