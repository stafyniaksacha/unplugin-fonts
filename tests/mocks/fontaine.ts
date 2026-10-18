import { vi } from 'vitest'

export const robotoMetrics = {
  ascent: 1900,
  descent: -500,
  lineGap: 0,
  unitsPerEm: 2048,
  xWidthAvg: 969,
  category: 'sans-serif',
}

export const arialMetrics = {
  ascent: 1854,
  descent: -434,
  lineGap: 67,
  unitsPerEm: 2048,
  xWidthAvg: 904,
  category: 'sans-serif',
}

export const generateFallbackName = vi.fn((name: string) => `${name} fallback`)

export const generateFontFace = vi.fn((metrics, fallback) => {
  return `@font-face {\n  font-family: "${fallback.name}";\n  src: local("${fallback.font}");\n  size-adjust: 107.19%;\n  ascent-override: 86.28%;\n  descent-override: 22.71%;\n  line-gap-override: 0%;\n}\n`
})

export const timesMetrics = {
  ascent: 1825,
  descent: -443,
  lineGap: 87,
  unitsPerEm: 2048,
  xWidthAvg: 819,
  category: 'serif',
}

export const getMetricsForFamily = vi.fn(async (family: string) => {
  const map: Record<string, any> = {
    'Roboto': robotoMetrics,
    'Arial': arialMetrics,
    'Times New Roman': timesMetrics,
  }
  return map[family] ?? null
})

export const readMetrics = vi.fn(async () => robotoMetrics)

export const resolveCategoryFallbacks = vi.fn(() => ['Arial'])

export const DEFAULT_CATEGORY_FALLBACKS = {
  'sans-serif': ['BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'Arial', 'Noto Sans'],
  'serif': ['Times New Roman', 'Georgia', 'Noto Serif'],
  'monospace': ['Courier New', 'Roboto Mono', 'Noto Sans Mono'],
}

export const FontaineTransform: { raw: (...args: any[]) => any } = { raw: vi.fn() }
