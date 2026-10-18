import { describe, expect, it, vi } from 'vitest'
import { typekitLoader } from '../../src/loaders/typekit.js'

describe('typekit loader', () => {
  it('warns and produces nothing when no kit ID is provided', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = typekitLoader({ id: undefined as any })
    expect(result).toEqual([])
    expect(warn).toHaveBeenCalledWith('A Typekit id is required')
  })

  it('defers font loading by default', () => {
    const tag = typekitLoader({ id: 'abc123' })[0]!
    expect(tag.tag).toBe('link')
    expect(tag.attrs?.rel).toBe('preload')
    expect(tag.attrs?.as).toBe('style')
    expect(tag.attrs?.onload).toContain('stylesheet')
    expect(tag.attrs?.href).toBe('https://use.typekit.net/abc123.css')
  })

  it('loads font immediately when deferring is disabled', () => {
    const tag = typekitLoader({ id: 'abc123', defer: false })[0]!
    expect(tag.attrs?.rel).toBe('stylesheet')
    expect(tag.attrs?.onload).toBeUndefined()
    expect(tag.attrs?.as).toBeUndefined()
  })

  it('supports custom CDN base URL', () => {
    const tag = typekitLoader({ id: 'xyz', fontBaseUrl: 'https://custom.cdn/' })[0]!
    expect(tag.attrs?.href).toBe('https://custom.cdn/xyz.css')
  })

  it('allows controlling where the tag is injected', () => {
    const tag = typekitLoader({ id: 'abc123', injectTo: 'body' })[0]!
    expect(tag.injectTo).toBe('body')
  })
})
