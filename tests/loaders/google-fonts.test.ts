import { describe, expect, it, vi } from 'vitest'
import { googleLoader } from '../../src/loaders/google-fonts.js'

describe('google fonts loader', () => {
  it('warns and produces nothing when no font families are given', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = googleLoader({ families: undefined as any })
    expect(result).toEqual([])
    expect(warn).toHaveBeenCalled()
  })

  it('emits a preconnect then a deferred stylesheet preload by default', () => {
    expect(googleLoader({ families: ['Roboto', { name: 'Open Sans', styles: 'wght@400;700' }] })).toEqual([
      {
        tag: 'link',
        injectTo: 'head-prepend',
        attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com/', crossorigin: 'anonymous' },
      },
      {
        tag: 'link',
        injectTo: 'head-prepend',
        attrs: {
          rel: 'preload',
          as: 'style',
          onload: 'this.rel=\'stylesheet\'',
          href: 'https://fonts.googleapis.com/css2?family=Roboto&family=Open Sans:wght@400;700&display=swap',
        },
      },
    ])
  })

  it('emits preconnect, deferred preload and blocking stylesheet in that order when mixing defer', () => {
    const tags = googleLoader({
      families: ['Roboto', { name: 'Open Sans', defer: false }],
      display: 'block',
      preconnect: false,
      injectTo: 'body',
    })

    expect(tags).toEqual([
      {
        tag: 'link',
        injectTo: 'body',
        attrs: {
          rel: 'preload',
          as: 'style',
          onload: 'this.rel=\'stylesheet\'',
          href: 'https://fonts.googleapis.com/css2?family=Roboto&display=block',
        },
      },
      {
        tag: 'link',
        injectTo: 'body',
        attrs: {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Open Sans&display=block',
        },
      },
    ])
  })

  it('preconnects to the font CDN by default', () => {
    const tags = googleLoader({ families: ['Roboto'] })
    const preconnect = tags.find(t => t.attrs?.rel === 'preconnect')
    expect(preconnect).toBeDefined()
    expect(preconnect!.attrs?.href).toBe('https://fonts.gstatic.com/')
  })

  it('defers font loading by default for string families', () => {
    const tags = googleLoader({ families: ['Roboto'] })
    const preload = tags.find(t => t.attrs?.rel === 'preload')
    expect(preload).toBeDefined()
    expect(preload!.attrs?.href).toContain('family=Roboto')
    expect(preload!.attrs?.href).toContain('display=swap')
  })

  it('loads fonts immediately when deferring is disabled', () => {
    const tags = googleLoader({ families: [{ name: 'Roboto', defer: false }] })
    const stylesheet = tags.find(t => t.attrs?.rel === 'stylesheet')
    expect(stylesheet).toBeDefined()
    expect(stylesheet!.attrs?.href).toContain('family=Roboto')
  })

  it('appends font styles to the request URL', () => {
    const tags = googleLoader({ families: [{ name: 'Roboto', styles: 'wght@400;700' }] })
    const preload = tags.find(t => t.attrs?.rel === 'preload')
    expect(preload!.attrs?.href).toContain('family=Roboto:wght@400;700')
  })

  it('combines multiple families into one request', () => {
    const tags = googleLoader({ families: ['Roboto', 'Open Sans'] })
    const preload = tags.find(t => t.attrs?.rel === 'preload')
    expect(preload!.attrs?.href).toContain('family=Roboto')
    expect(preload!.attrs?.href).toContain('family=Open Sans')
  })

  it('skips preconnect when disabled', () => {
    const tags = googleLoader({ families: ['Roboto'], preconnect: false })
    expect(tags.find(t => t.attrs?.rel === 'preconnect')).toBeUndefined()
  })

  it('appends display strategy and text subsetting to the URL', () => {
    const tags = googleLoader({ families: ['Roboto'], display: 'block', text: 'hello' })
    const preload = tags.find(t => t.attrs?.rel === 'preload')
    expect(preload!.attrs?.href).toContain('display=block')
    expect(preload!.attrs?.href).toContain('text=hello')
  })

  it('does not append display param when set to auto', () => {
    const tags = googleLoader({ families: ['Roboto'], display: 'auto' })
    const preload = tags.find(t => t.attrs?.rel === 'preload')
    expect(preload!.attrs?.href).not.toContain('display=')
  })

  it('separates deferred and non-deferred families into distinct tags', () => {
    const tags = googleLoader({
      families: ['Roboto', { name: 'Open Sans', defer: false }],
    })
    const preload = tags.find(t => t.attrs?.rel === 'preload')
    const stylesheet = tags.find(t => t.attrs?.rel === 'stylesheet')
    expect(preload!.attrs?.href).toContain('family=Roboto')
    expect(stylesheet!.attrs?.href).toContain('family=Open Sans')
  })

  it('injects every tag where requested', () => {
    const tags = googleLoader({ families: ['Roboto', { name: 'Lato', defer: false }], injectTo: 'body-prepend' })
    expect(tags).toHaveLength(3)
    expect(tags.map(t => t.injectTo)).toEqual(['body-prepend', 'body-prepend', 'body-prepend'])
  })

  it('supports self-hosted mirrors of the CSS API and font origin', () => {
    const tags = googleLoader({
      families: ['Roboto', { name: 'Lato', defer: false }],
      fontBaseUrl: 'https://fonts.example.com/css2',
      preconnectUrl: 'https://static.example.com/',
    })
    expect(tags.map(t => t.attrs?.href)).toEqual([
      'https://static.example.com/',
      'https://fonts.example.com/css2?family=Roboto&display=swap',
      'https://fonts.example.com/css2?family=Lato&display=swap',
    ])
  })

  it('warns and skips families without a name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const tags = googleLoader({ families: [{ name: '' }, 'Roboto'] })
    expect(warn).toHaveBeenCalledWith('A google font family name is missing')
    expect(tags.find(t => t.attrs?.rel === 'preload')!.attrs?.href).toBe('https://fonts.googleapis.com/css2?family=Roboto&display=swap')
  })

  it('skips falsy entries and emits nothing when no family remains', () => {
    expect(googleLoader({ families: [null as any, undefined as any] })).toEqual([])
  })
})
