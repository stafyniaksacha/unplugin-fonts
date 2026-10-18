import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { expect, it } from 'vitest'
import Unfonts from '../../src/vite.js'

it('generates fallbacks from installed Fontsource files missing from the metrics database', async () => {
  const root = await mkdtemp(fileURLToPath(new URL('./fontsource-fixture-', import.meta.url)))
  try {
    await writeFile(`${root}/index.html`, '<script type="module" src="/main.js"></script>')
    await writeFile(`${root}/main.js`, 'import "unfonts.css"; import "./style.css"')
    await writeFile(`${root}/style.css`, 'body { font-family: "Iosevka Aile", sans-serif } code { font-family: "Iosevka", monospace }')

    const result = await build({
      root,
      configFile: false,
      logLevel: 'silent',
      plugins: [Unfonts({
        fontsource: {
          families: [
            { name: 'Iosevka Aile', weights: [300, 400, 500, 700], fallback: { category: 'sans-serif' } },
            { name: 'Iosevka', weights: [400, 700], fallback: { category: 'monospace' } },
          ],
        },
      })],
      build: { write: false, minify: false, cssMinify: false },
    })
    type BuildOutput = Extract<Awaited<ReturnType<typeof build>>, { output: unknown }>
    const outputs = (Array.isArray(result) ? result : [result]) as BuildOutput[]
    const css = outputs.flatMap(output => output.output)
      .filter(output => output.type === 'asset')
      .filter(output => output.fileName.endsWith('.css'))
      .map(output => output.source.toString())
      .join('\n')

    expect(css).toMatch(/font-family:\s*["']Iosevka Aile fallback["']/)
    expect(css).toMatch(/font-family:\s*["']Iosevka fallback["']/)
    expect(css).toContain('size-adjust:')
    expect(css).toContain('ascent-override:')
    expect(css).toContain('descent-override:')
  }
  finally {
    await rm(root, { recursive: true })
  }
})
