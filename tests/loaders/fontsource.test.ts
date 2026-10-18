import { describe, expect, it } from 'vitest'
import { fontsourceImports, fontsourceVirtualModule } from '../../src/loaders/fontsource.js'

describe('fontsource loader', () => {
  it('produces nothing with no configuration', () => {
    expect(fontsourceImports()).toEqual([])
  })

  it('resolves a simple font family name to its CSS import path', () => {
    expect(fontsourceImports({ families: ['Roboto'] }))
      .toEqual(['@fontsource/roboto/index.css'])
  })

  it('normalizes family names with spaces to hyphens', () => {
    expect(fontsourceImports({ families: ['Open Sans'] }))
      .toEqual(['@fontsource/open-sans/index.css'])
  })

  it('routes variable font families to the fontsource-variable package', () => {
    expect(fontsourceImports({ families: ['roboto-variable'] }))
      .toEqual(['@fontsource-variable/roboto/index.css'])
  })

  it('routes object family with variable: true to fontsource-variable', () => {
    expect(fontsourceImports({ families: [{ name: 'Roboto', variable: true }] }))
      .toEqual(['@fontsource-variable/roboto/index.css'])
  })

  it('routes family ending with " Variable" to fontsource-variable', () => {
    expect(fontsourceImports({ families: [{ name: 'Roboto Variable', variable: true }] }))
      .toEqual(['@fontsource-variable/roboto/index.css'])
  })

  it('selects index.css for wght-only variable font', () => {
    expect(fontsourceImports({ families: [{ name: 'Roboto', variable: { wght: true } }] }))
      .toEqual(['@fontsource-variable/roboto/index.css'])
  })

  it('selects wght-italic.css for wght+ital variable font', () => {
    expect(fontsourceImports({ families: [{ name: 'Roboto', variable: { wght: true, ital: true } }] }))
      .toEqual(['@fontsource-variable/roboto/wght-italic.css'])
  })

  it('selects axis-specific file for wght+wdth variable font', () => {
    expect(fontsourceImports({ families: [{ name: 'Roboto', variable: { wght: true, wdth: true } }] }))
      .toEqual(['@fontsource-variable/roboto/wdth.css'])
  })

  it('selects standard.css for multiple standard axes', () => {
    expect(fontsourceImports({ families: [{ name: 'Roboto', variable: { wght: true, wdth: true, slnt: true } }] }))
      .toEqual(['@fontsource-variable/roboto/standard.css'])
  })

  it('generates per-weight imports when specific weights are requested', () => {
    expect(fontsourceImports({ families: [{ name: 'Roboto', weights: [400, 700] }] }))
      .toEqual(['@fontsource/roboto/400.css', '@fontsource/roboto/700.css'])
  })

  it('generates per-weight-per-style imports when styles are specified', () => {
    expect(fontsourceImports({ families: [{ name: 'Roboto', weights: [400], styles: ['normal', 'italic'] }] }))
      .toEqual(['@fontsource/roboto/400.css', '@fontsource/roboto/400-italic.css'])
  })

  it('applies subset prefix to import paths', () => {
    expect(fontsourceImports({ families: [{ name: 'Roboto', weights: [400], subset: 'latin' }] }))
      .toEqual(['@fontsource/roboto/latin-400.css'])
  })

  it('skips falsy entries in the families list', () => {
    expect(fontsourceImports({ families: [null as any, 'Roboto'] }))
      .toEqual(['@fontsource/roboto/index.css'])
  })

  it('wraps all import paths into a valid CSS virtual module', () => {
    const result = fontsourceVirtualModule({ families: ['Roboto', 'Open Sans'] })
    expect(result).toBe(
      '@import "@fontsource/roboto/index.css";\n@import "@fontsource/open-sans/index.css";',
    )
  })
})
