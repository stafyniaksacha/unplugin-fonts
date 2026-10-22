import type { HtmlTagDescriptor } from 'vite'

export interface FontFallbackConfig {
  /**
   * System fonts to use as fallback bases.
   * When not provided, fontaine auto-selects by category.
   * @example ['Arial', 'Helvetica Neue']
   */
  fallbacks?: string[]

  /**
   * Generic font category. Used to auto-select system fallbacks
   * when `fallbacks` is not provided.
   * @default 'sans-serif'
   */
  category?: 'sans-serif' | 'serif' | 'monospace'

  /**
   * Override the generated fallback font-face name.
   * @default '{familyName} fallback'
   */
  name?: string
}

export interface Options {
  /** Custom font families loaded from local files. */
  custom?: CustomFonts
  /** Font families loaded from Fontsource packages. */
  fontsource?: FontsourceFonts
  /** Font families loaded from Google Fonts. */
  google?: GoogleFonts
  /** Font families loaded from Adobe Typekit. */
  typekit?: TypeKitFonts
  /** Enable sourcemap generation for virtual CSS modules. */
  sourcemap?: string
  /**
   * Inline `@font-face` rules into the HTML as a `<style>` tag
   * instead of keeping them in the external CSS bundle.
   * Reduces render-blocking requests and can improve LCP.
   * @default false
   */
  inlineFontFace?: boolean
}

export interface CustomFontFace {
  /** Original glob source pattern that matched this font face. */
  source: string
  /** Font family name. */
  name: string
  /** Base filename without extension. */
  basename: string
  /** Font weight value or range inferred from the filename. */
  weight: number | `${number} ${number}`
  /** Font style inferred from the filename (e.g. 'normal', 'italic'). */
  style: string
  /** Value for the `font-display` descriptor. */
  display: string
  /** Local font name(s) for `src: local()` in the `@font-face` rule. */
  local?: string | string[] | undefined
  /** Resolved font files matching the source pattern. */
  files: {
    /** Absolute path to the font file on disk. */
    src: string
    /** File extension (e.g. '.woff2'). */
    ext: string
    /** Public-facing URL path for the font file. */
    path: string
    /** CSS font format string (e.g. 'woff2', 'truetype'). */
    format: string
  }[]
}

export interface CustomFontFamily {
  /**
   * Name of the font family.
   * @example 'Comic Sans MS'
   */
  name: string

  /**
   * Regex(es) of font files to import. The names of the files will
   * predicate the `font-style` and `font-weight` values of the `@font-rule`'s.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight#common_weight_name_mapping
   *
   * @example
   * A value of `./RobotoBoldItalic.*` will create this `@font-rule`:
   *
   * ```css
   * font-face {
   *    font-family: 'Roboto';
   *    src: url(./RobotoBoldItalic.woff2) format('woff2'),
   *         url(./RobotoBoldItalic.woff) format('woff'),
   *         url(./RobotoBoldItalic.ttf) format('truetype');
   *    font-weight: bold;
   *    font-style: italic;
   *    font-display: auto;
   * }
   * ```
   */
  src: string | string[]
  /**
   * Local name of the font. Used to add `src: local()` to `@font-rule`.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face#description
   */
  local?: string | string[]
  /**
   * Allows to transform the generated config for any font face.
   *
   * @param font
   * @returns
   */
  transform?: (font: CustomFontFace) => CustomFontFace | null

  /**
   * Generate a fallback @font-face with adjusted metrics to reduce CLS.
   * Uses fontaine to compute size-adjust, ascent-override, descent-override,
   * and line-gap-override from the font file.
   */
  fallback?: FontFallbackConfig
}

export interface CustomFonts {
  /**
   * Font families.
   */
  families: CustomFontFamily[] | Record<string, string | string[] | Omit<CustomFontFamily, 'name'>>

  /**
   * Defines the default `font-display` value used for the generated
   * `@font-rule` classes.
   * @see https://developer.mozilla.org/fr/docs/Web/CSS/@font-face/font-display
   * @default 'auto'
   */
  display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional'

  /**
   * Using `<link rel="preload">` will trigger a request for the WebFont
   * early in the critical rendering path, without having to wait for the
   * CSSOM to be created.
   * @see https://web.dev/optimize-webfont-loading/#preload-your-webfont-resources
   * @default true
   */
  preload?: boolean

  /**
   * Using `<link rel="prefetch">` is intended for prefetching resources
   * that will be used in the next navigation/page load
   * (e.g. when you go to the next page)
   *
   * Note: this can not be used with `preload`
   * @default false
   */
  prefetch?: boolean
  /**
   * URL prefix of the preload/prefetch links of fonts served from the public
   * directory. Defaults to the bundler base (Vite `base`, Nuxt `app.baseURL`).
   */
  prefetchPrefix?: string
  /**
   * Provides a hook for filtering which `<link>` tags should be actually
   * generated.
   * @default true
   */
  linkFilter?: (tags: HtmlTagDescriptor[]) => HtmlTagDescriptor[] | boolean

  /**
   * @default: 'head-prepend'
   */
  injectTo?: 'head' | 'body' | 'head-prepend' | 'body-prepend'

  /**
   * Directory, relative to the project root, removed from the front of font paths
   * to build their URL (`public/fonts/a.woff2` → `/fonts/a.woff2`).
   * `public`, `./public` and `public/` are equivalent.
   * @default: 'public/'
   */
  stripPrefix?: string
}

interface BaseFontsourceFontFamily {
  /**
   * Name of the font family.
   * @example 'Roboto'
   */
  name: string
  /**
   * Font styles to load.
   * @default ['normal']
   */
  styles?: ('italic' | 'normal')[]
  /**
   * Font subset to load (e.g. 'latin', 'latin-ext').
   */
  subset?: string

  /**
   * Generate a fallback @font-face with adjusted metrics to reduce CLS.
   * Uses fontaine to look up font metrics by family name.
   */
  fallback?: FontFallbackConfig
}
interface WeightsFontsourceFontFamily extends BaseFontsourceFontFamily {
  /**
   * Font weights to load.
   * @example [400, 700]
   */
  weights: (100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900)[]
}
interface VariableFontsourceFontFamily extends BaseFontsourceFontFamily {
  /**
   * Enable variable font axes. Set to `true` to load the default
   * variable font, or specify individual axes to load.
   */
  variable: true | {
    /** Weight axis. */
    wght?: boolean
    /** Width axis. */
    wdth?: boolean
    /** Slant axis. */
    slnt?: boolean
    /** Optical size axis. */
    opsz?: boolean
    /** Italic axis. */
    ital?: boolean
  }
}
export type FontsourceFontFamily = WeightsFontsourceFontFamily | VariableFontsourceFontFamily
export interface FontsourceFonts {
  /**
   * Font families to load from Fontsource.
   * Can be strings (load default set) or objects for fine-grained control.
   */
  families: (string | FontsourceFontFamily)[]
}

export interface GoogleFontFamily {
  /**
   * Font family name.
   * @example 'Roboto'
   */
  name: string
  /**
   * Font styles/weights to load using the Google Fonts CSS2 API format.
   * @example 'ital,wght@0,400;1,200'
   */
  styles?: string
  /**
   * Enable non-blocking renderer using `<link rel="preload">`.
   * @default true
   */
  defer?: boolean

  /**
   * Generate a fallback @font-face with adjusted metrics to reduce CLS.
   * Uses fontaine to look up font metrics by family name.
   */
  fallback?: FontFallbackConfig
}
export interface GoogleFonts {
  /**
   * Font families to load from Google Fonts.
   * Can be strings (only regular 400 will be loaded) or objects for fine-grained control.
   */
  families: (string | GoogleFontFamily)[]
  /**
   * Subset the font to only include glyphs needed for the given text.
   * @see https://developers.google.com/fonts/docs/css2#optimizing_your_font_requests
   */
  text?: string
  /**
   * Font display strategy.
   * @default 'swap'
   */
  display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional'
  /**
   * Enable preconnect link injection to warm up the fonts origin.
   * @default true
   */
  preconnect?: boolean
  /**
   * @default: 'head-prepend'
   */
  injectTo?: 'head' | 'body' | 'head-prepend' | 'body-prepend'
  /**
   * @default: 'https://fonts.googleapis.com/css2'
   */
  fontBaseUrl?: string
  /**
   * @default: 'https://fonts.gstatic.com/'
   */
  preconnectUrl?: string
}

export interface TypeKitFontFamily {
  /**
   * Font family name as it appears in the Typekit project.
   * @example 'Futura PT'
   */
  name: string

  /**
   * Generate a fallback @font-face with adjusted metrics to reduce CLS.
   * Uses fontaine to look up font metrics by family name.
   */
  fallback?: FontFallbackConfig
}

export interface TypeKitFonts {
  /**
   * Typekit project ID.
   * @example 'abc1def'
   */
  id: string
  /**
   * Enable non-blocking renderer using `<link rel="preload">`.
   * @default true
   */
  defer?: boolean
  /**
   * default: 'head-prepend'
   */
  injectTo?: 'head' | 'body' | 'head-prepend' | 'body-prepend'
  /**
   * @default: 'https://use.typekit.net/'
   */
  fontBaseUrl?: string

  /**
   * Font families in this Typekit project.
   * Needed to generate fallback @font-face declarations since Typekit
   * only provides a project ID, not individual family metadata.
   */
  families?: (string | TypeKitFontFamily)[]
}
