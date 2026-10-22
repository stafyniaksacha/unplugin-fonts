import type { HtmlTagDescriptor } from 'vite'
import type { CustomFonts, Options } from '../types.js'
import { customLoader } from './custom.js'
import { googleLoader } from './google-fonts.js'
import { typekitLoader } from './typekit.js'

/**
 * Head `<link>` tags known before bundling. Custom fonts are included when the
 * project root is known (the bundled ones are linked from the bundle instead).
 */
export function getHeadLinkTags(resolvedOptions: Options, root?: string, base?: string) {
  const tags: HtmlTagDescriptor[] = []

  if (resolvedOptions.typekit)
    tags.push(...typekitLoader(resolvedOptions.typekit))

  if (resolvedOptions.google)
    tags.push(...googleLoader(resolvedOptions.google))

  if (resolvedOptions.custom && root !== undefined)
    tags.push(...customLoader(resolvedOptions.custom, root, base))

  return tags
}

/**
 * Apply the user's `linkFilter`: an array replaces the tags, a boolean keeps or drops them all.
 * Consumers call it once, on every link they emit.
 */
export function applyLinkFilter(tags: HtmlTagDescriptor[], linkFilter: CustomFonts['linkFilter']) {
  if (!linkFilter)
    return tags

  const filtered = linkFilter(tags)
  if (Array.isArray(filtered))
    return filtered

  return filtered ? tags : []
}
