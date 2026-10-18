import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { build } from 'vite'
import { describe, expect, it } from 'vitest'
import Unfonts from '../../src/vite.js'

describe('google Fonts text subsetting in built HTML', () => {
  it.each([true, false])('preserves URL-significant characters with defer = %s', async (defer) => {
    const root = await mkdtemp(resolve(tmpdir(), 'unfonts-google-'))
    const text = 'A&B#C+D % café 字'
    try {
      await writeFile(resolve(root, 'index.html'), '<html><head></head><body></body></html>')
      await build({
        configFile: false,
        root,
        logLevel: 'silent',
        plugins: [Unfonts({ google: { families: [{ name: 'Roboto', defer }], text } })],
      })
      const html = await readFile(resolve(root, 'dist/index.html'), 'utf8')
      const href = html.match(/href="(https:\/\/fonts.googleapis.com\/css2[^"]*)"/)![1]!.replaceAll('&amp;', '&')
      const url = new URL(href)
      expect(url.searchParams.get('text')).toBe(text)
      expect(url.searchParams.get('family')).toBe('Roboto')
      expect(url.hash).toBe('')
    }
    finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
