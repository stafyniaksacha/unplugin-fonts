import type { FontsourceFonts } from '../types.js'

export function fontsourceImports(options?: FontsourceFonts) {
  const source: string[] = []

  const {
    families = [],
  } = options || {}

  for (const family of families) {
    if (!family)
      continue

    if (typeof family === 'string') {
      const name = family.toLowerCase().replace(/ /g, '-')
      if (name.endsWith('-variable')) {
        source.push(`@fontsource-variable/${name.replace('-variable', '')}/index.css`)
      }
      else {
        source.push(`@fontsource/${name}/index.css`)
      }
      continue
    }

    const name = family.name.toLowerCase()
      .replace(/ /g, '-')
      .replace('-variable', '')

    if (family.name.endsWith(' Variable') && !('variable' in family)) {
      source.push(`@fontsource-variable/${name}/index.css`)
      continue
    }

    if ('variable' in family) {
      if (family.variable === true) {
        source.push(`@fontsource-variable/${name}/index.css`)
        continue
      }

      const activeAxes = Object.keys(family.variable).filter(axis => axis !== 'ital')
      const isItal = family.variable.ital
      const isStandard = activeAxes.every(axis =>
        ['wght', 'wdth', 'slnt', 'opsz'].includes(axis),
      )
      if (activeAxes.length === 1 && family.variable.wght) {
        if (isItal) {
          source.push(`@fontsource-variable/${name}/wght-italic.css`)
          continue
        }

        source.push(`@fontsource-variable/${name}/index.css`)
        continue
      }

      if (activeAxes.length === 2 && family.variable.wght) {
        const selected
          = activeAxes.find(axis => axis !== 'wght')?.toLowerCase() ?? 'wght'
        if (isItal) {
          source.push(`@fontsource-variable/${name}/${selected}-italic.css`)
          continue
        }
        source.push(`@fontsource-variable/${name}/${selected}.css`)
        continue
      }

      if (isStandard) {
        source.push(`@fontsource-variable/${name}/standard.css`)
        continue
      }

      // If the selected axes is not within standard, return full
      source.push(`@fontsource-variable/${name}/full.css`)
      continue
    }

    if ('weights' in family) {
      const subsetPrefix = family.subset ? `${family.subset}-` : ''
      for (const weight of family.weights) {
        if (family.styles) {
          for (const style of family.styles) {
            if (style === 'normal')
              source.push(`@fontsource/${name}/${subsetPrefix}${weight}.css`)
            else
              source.push(`@fontsource/${name}/${subsetPrefix}${weight}-${style}.css`)
          }
        }
        else {
          source.push(`@fontsource/${name}/${subsetPrefix}${weight}.css`)
        }
      }
    }
  }

  return source
}

export function fontsourceVirtualModule(options?: FontsourceFonts) {
  return fontsourceImports(options)
    .map(src => `@import "${src}";`)
    .join('\n')
}
