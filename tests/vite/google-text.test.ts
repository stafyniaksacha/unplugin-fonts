import { describe, expect, it } from 'vitest'
import { buildFixture } from '../helpers/vite.js'

describe('google Fonts text subsetting in built HTML', () => {
  it.each([true, false])('preserves URL-significant characters with defer = %s', async (defer) => {
    const text = 'A&B#C+D % café 字'
    const { html } = await buildFixture({
      files: { 'index.html': '<html><head></head><body></body></html>' },
      options: { google: { families: [{ name: 'Roboto', defer }], text } },
    })

    const href = html['index.html']!.match(/href="(https:\/\/fonts.googleapis.com\/css2[^"]*)"/)![1]!.replaceAll('&amp;', '&')
    const url = new URL(href)
    expect(url.searchParams.get('text')).toBe(text)
    expect(url.searchParams.get('family')).toBe('Roboto')
    expect(url.hash).toBe('')
  })
})
