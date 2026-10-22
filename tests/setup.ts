// Keep the suite hermetic: no test may reach Google Fonts, Typekit or any other CDN.
// Assigned directly (not via vi.stubGlobal) so `unstubGlobals` does not undo it.
globalThis.fetch = async (input: Parameters<typeof fetch>[0]) => {
  throw new Error(`Network access is disabled in tests (fetch ${String(input)})`)
}
