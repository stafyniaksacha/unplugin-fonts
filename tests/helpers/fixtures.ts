import type { Options } from '../../src/types.js'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const iosevkaFiles = fileURLToPath(new URL('../../node_modules/@fontsource/iosevka/files/', import.meta.url))

/**
 * A two-page project with one bundled custom family (`Body`, with a fallback and a
 * transform) and one served from the public directory (`Display`).
 */
export async function customFontsProject(extraOptions: Omit<Options, 'custom'> = {}) {
  const regular = await readFile(`${iosevkaFiles}iosevka-latin-400-normal.woff2`)
  const bold = await readFile(`${iosevkaFiles}iosevka-latin-700-normal.woff2`)
  const page = '<html><head></head><body><h1>Fonts</h1><script type="module" src="/main.js"></script></body></html>'

  const options: Options = {
    ...extraOptions,
    custom: {
      display: 'swap',
      families: {
        Body: {
          src: './src/fonts/Body-*',
          fallback: { category: 'sans-serif' },
          transform(face) {
            if (face.basename === 'Body-Regular')
              face.weight = '100 900'
            return face
          },
        },
        Display: './public/fonts/Display-*',
      },
    },
  }

  return {
    files: {
      'index.html': page,
      'about.html': page,
      'main.js': 'import "unfonts.css"; import "./style.css"',
      'style.css': 'body { font-family: Body, sans-serif } h1 { font-family: "Display", serif }',
      'src/fonts/Body-Regular.woff2': regular,
      'src/fonts/Body-Bold.woff2': bold,
      'public/fonts/Display-Regular.woff2': regular,
    },
    input: ['index.html', 'about.html'],
    options,
  }
}

/** `href` of every `<link as="font">` in an HTML page. */
export function fontLinkHrefs(html: string) {
  return [...html.matchAll(/<link\s[^>]*?\sas="font"[^>]*>/g)]
    .flatMap(([tag]) => tag.match(/\shref="([^"]+)"/)?.[1] ?? [])
}
