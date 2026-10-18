import type { HookParameters } from 'astro'
import { describe, expect, it, vi } from 'vitest'
import astro from '../../src/astro.js'

async function configSetup(plugins?: unknown[]) {
  const context = { config: { vite: { plugins } }, injectScript: vi.fn() }
  const integration = astro({ google: { families: ['Roboto'] } })
  // Only the parts of the setup context the integration uses.
  await integration.hooks['astro:config:setup']!(context as unknown as HookParameters<'astro:config:setup'>)
  return { integration, context }
}

describe('astro integration', () => {
  it('registers the vite plugin and imports the generated CSS on every page', async () => {
    const { integration, context } = await configSetup()

    expect(integration.name).toBe('unplugin-fonts')
    expect(context.config.vite.plugins).toEqual([expect.objectContaining({ name: 'unplugin-fonts' })])
    expect(context.injectScript).toHaveBeenCalledWith('page-ssr', 'import "unfonts.css";')
  })

  it('keeps the vite plugins already configured', async () => {
    const existing = { name: 'existing' }

    const { context } = await configSetup([existing])

    expect(context.config.vite.plugins).toEqual([existing, expect.objectContaining({ name: 'unplugin-fonts' })])
  })
})
