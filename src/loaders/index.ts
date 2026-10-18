import type { HtmlTagDescriptor } from 'vite'
import type { Options } from '../types.js'
import { googleLoader } from './google-fonts.js'
// import { customLoader } from './custom.js'
import { typekitLoader } from './typekit.js'

export function getHeadLinkTags(resolvedOptions: Options) {
  const tags: HtmlTagDescriptor[] = []

  if (resolvedOptions.typekit)
    tags.push(...typekitLoader(resolvedOptions.typekit))

  if (resolvedOptions.google)
    tags.push(...googleLoader(resolvedOptions.google))

  // if (resolvedOptions.custom)
  //   tags.push(...customLoader(resolvedOptions.custom, root))

  return tags
}
