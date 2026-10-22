# unplugin-fonts

㊗️ Universal Webfont loader - Unfonts

[![npm](https://img.shields.io/npm/v/unplugin-fonts.svg)](https://www.npmjs.com/package/unplugin-fonts)

This plugin goes beyond just generating font-face rules - it also takes care of link preload and prefetch, optimizing font loading for a faster and more efficient user experience.

Unfonts currently supports popular font providers like Typekit, Google Fonts, and Fontsource, as well as custom fonts. This gives you the flexibility to choose from a vast range of fonts and seamlessly integrate them into your projects.

With Unfonts, you no longer have to manually manage font files and font-face rules, or worry about slow loading times. Our package does all the heavy lifting for you, so you can focus on creating amazing content with ease.

View configuration:
- [Typekit](#typekit)
- [Google Fonts](#google-fonts)
- [Custom Fonts](#custom-fonts)
- [Fontsource](#fontsource)
- [Font Fallback Metrics](#font-fallback-metrics)

## Install

```bash
npm i --save-dev unplugin-fonts # pnpm add -D unplugin-fonts
```

<details>
<summary>Vite</summary><br>

```ts
// vite.config.ts
import Unfonts from 'unplugin-fonts/vite'

export default defineConfig({
  plugins: [
    Unfonts({ /* options */ }),
  ],
})
```

Example: [`examples/vite-8`](./examples/vite-8)

<br></details>

<!-- <details>
<summary>Rollup</summary><br>

```ts
// rollup.config.js
import Starter from 'unplugin-fonts/rollup'

export default {
  plugins: [
    Starter({ /* options */ }),
  ],
}
```

<br></details> -->

<details>
<summary>Webpack</summary><br>

> **Warning**
> Not implemented yet

```ts
// webpack.config.js
module.exports = {
  /* ... */
  plugins: [
    require('unplugin-fonts/webpack')({ /* options */ })
  ]
}
```

<br></details>

<details>
<summary>Nuxt</summary><br>

```ts
// nuxt.config.js
export default {
  modules: [
    ['unplugin-fonts/nuxt'],
  ],
  unfonts: {
    /* options */
  }
}
```

Example: [`examples/nuxt`](./examples/nuxt)

<br></details>

<!-- <details>
<summary>Vue CLI</summary><br>

```ts
// vue.config.js
module.exports = {
  configureWebpack: {
    plugins: [
      require('unplugin-fonts/webpack')({ /* options */ }),
    ],
  },
}
```

<br></details> -->

<details>
<summary>SvelteKit</summary><br>

```ts
import { sveltekit } from '@sveltejs/kit/vite'
import Unfonts from 'unplugin-fonts/vite'
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    sveltekit(),
    Unfonts({
      /* options */
    })
  ]
})
```

```html
<script>
// +layout.svelte
import { links } from 'unplugin-fonts/head'
</script>

<svelte:head>
  {#each links as link}
    <link {...link?.attrs || {}} />
  {/each}
</svelte:head>
```

Example: [`examples/sveltekit`](./examples/sveltekit)

<br></details>

<details>
<summary>Astro</summary><br>

```ts
// astro.config.js
import { defineConfig } from 'astro/config'
import Unfonts from 'unplugin-fonts/astro'

export default defineConfig({
  integrations: [
    Unfonts({
      /* options */
    })
  ]
})
```

```astro
---
// src/pages/index.astro
import Unfont from 'unplugin-fonts/astro/component.astro';
---

<html>
  <head>
    <Unfont />
  </head>
  <body>
    <!-- ... -->
  </body>
</html>
```

Example: [`examples/astro-5`](./examples/astro-5)

<br></details>

---

<details>
<summary>Migrating from <code>vite-plugin-fonts</code></summary><br>

```diff
// vite.config.ts
-import { VitePluginFonts } from 'vite-plugin-fonts'
+import Unfonts from 'unplugin-fonts/vite'

export default defineConfig({
  plugins: [
-    VitePluginFonts({
+    Unfonts({
      /* options */
    }),
  ],
})
```

```diff
// main.ts
-import 'virtual:fonts.css'
+import 'unfonts.css'
```

<br></details>

## Import generated `@font-rules` CSS

> **Note**
> Required if using **custom** or **fontsource** providers

```ts
import 'unfonts.css'
```

## Options

### Inline Font Face

Move `@font-face` rules from the external CSS bundle into an inline `<style>` tag in the HTML `<head>`. This lets the browser discover font URLs immediately without waiting for the stylesheet to load, reducing render-blocking requests and improving LCP.

```ts
Unfonts({
  inlineFontFace: true,
  // ...providers
})
```

## Providers

### Typekit

Load fonts from [Typekit](https://typekit.com/).

```ts
Unfonts({
  // Typekit API
  typekit: {
    /**
     * Typekit project id
     */
    id: '<projectId>',

    /**
     * customizes the base URL for the font request
     * default: 'https://use.typekit.net/'
     */
    fontBaseUrl: 'https://use.typekit.net/',

    /**
     * enable non-blocking renderer
     *   <link rel="preload" href="xxx" as="style" onload="this.rel='stylesheet'">
     * default: true
     */
    defer: true,

    /**
     * define where the font load tags should be inserted
     * default: 'head-prepend'
     *   values: 'head' | 'body' | 'head-prepend' | 'body-prepend'
     */
    injectTo: 'head-prepend',

    /**
     * Declare font families in this Typekit project to generate
     * fallback @font-face declarations that reduce layout shift.
     */
    families: [{
      name: 'Futura PT',
      fallback: { category: 'sans-serif' },
    }],
  },
})
```

### Google Fonts

Load fonts from [Google Fonts](https://fonts.google.com/).

```ts
Unfonts({
  // Google Fonts API V2
  google: {
    /**
     * enable preconnect link injection
     *   <link rel="preconnect" href="https://fonts.gstatic.com/" crossorigin>
     * default: true
     */
    preconnect: false,

    /**
     * allow preconnect to be customized
     * default: 'https://fonts.gstatic.com'
     */
    preconnectUrl: 'https://fonts.gstatic.com',

    /**
     * customizes the base URL for the font request
     * default: 'https://fonts.googleapis.com/css2'
     */
    fontBaseUrl: 'https://fonts.googleapis.com/css2',

    /**
     * values: auto, block, swap(default), fallback, optional
     * default: 'swap'
     */
    display: 'block',

    /**
     * define which characters to load
     * default: undefined (load all characters)
     */
    text: 'ViteAwsom',

    /**
     * define where the font load tags should be inserted
     * default: 'head-prepend'
     *   values: 'head' | 'body' | 'head-prepend' | 'body-prepend'
     */
    injectTo: 'head-prepend',

    /**
     * Fonts families lists
     */
    families: [
      // families can be either strings (only regular 400 will be loaded)
      'Source Sans Pro',

      // or objects
      {
        /**
         * Family name (required)
         */
        name: 'Roboto',

        /**
         * Family styles
         */
        styles: 'ital,wght@0,400;1,200',

        /**
         * enable non-blocking renderer
         *   <link rel="preload" href="xxx" as="style" onload="this.rel='stylesheet'">
         * default: true
         */
        defer: true,

        /**
         * Generate a fallback @font-face to reduce layout shift.
         * See "Font Fallback Metrics" section for details.
         */
        fallback: {
          category: 'sans-serif',
        },
      },
    ],
  },
})
```

### Custom Fonts

Load custom fonts from files.

```ts
Unfonts({
  // Custom fonts.
  custom: {
    /**
     * Fonts families lists
     */
    families: [{
      /**
       * Name of the font family.
       */
      name: 'Roboto',
      /**
       * Local name of the font. Used to add `src: local()` to `@font-rule`.
       */
      local: 'Roboto',
      /**
       * Regex(es) of font files to import. The names of the files will
       * predicate the `font-style` and `font-weight` values of the `@font-rule`'s.
       */
      src: './src/assets/fonts/*.ttf',

      /**
       * This function allow you to transform the font object before it is used
       * to generate the `@font-rule` and head tags.
       */
      transform(font) {
        if (font.basename === 'Roboto-Bold') {
          // update the font weight
          font.weight = 700
        }

        // we can also return null to skip the font
        return font
      },

      /**
       * Generate a fallback @font-face to reduce layout shift.
       * See "Font Fallback Metrics" section for details.
       */
      fallback: {
        category: 'sans-serif',
      },
    }],

    /**
     * Defines the default `font-display` value used for the generated
     * `@font-rule` classes.
     */
    display: 'auto',

    /**
     * Using `<link rel="preload">` will trigger a request for the WebFont
     * early in the critical rendering path, without having to wait for the
     * CSSOM to be created.
     */
    preload: true,

    /**
     * Using `<link rel="prefetch">` is intended for prefetching resources
     * that will be used in the next navigation/page load
     * (e.g. when you go to the next page)
     *
     * Note: this can not be used with `preload`
     */
    prefetch: false,

    /**
     * define where the font load tags should be inserted
     * default: 'head-prepend'
     *   values: 'head' | 'body' | 'head-prepend' | 'body-prepend'
     */
    injectTo: 'head-prepend',

    /**
     * Font files whose path (relative to the project root) starts with this
     * prefix are served as-is from the public directory, at the rest of the path.
     * default: 'public/'
     */
    stripPrefix: 'public/',

    /**
     * URL prefix of the preload/prefetch links of public fonts.
     * Defaults to Vite's `base` (Nuxt: `app.baseURL`).
     */
    prefetchPrefix: 'https://cdn.example.com/',

    /**
     * Filter the generated `<link>` tags: return an array to replace them,
     * or a boolean to keep or drop them all.
     */
    linkFilter: tags => tags,
  },

})
```

In the generated `@font-face` rules, `local()` sources come first, then files from the smallest format to the largest (woff2, woff, ttf, otf), since browsers use the first source they support. `transform` can change this order.

One preload (or prefetch) link is generated per font face, for its first file source, the one browsers download:

- files in the public directory are linked by their public URL: in the HTML with Vite and VitePress, in `unplugin-fonts/head` for Astro, and in `app.head` for Nuxt;
- other files go through the bundler and are linked by their hashed file name once the build is done (Vite and VitePress).

`linkFilter` applies to all of these links, as well as to the Google Fonts and Typekit ones.

### Fontsource

Load fonts from [Fontsource](https://fontsource.org/) packages.

> **Note**
> You will need to install `@fontsource/<font>` packages.

```ts
Unfonts({
  // Fontsource API
  fontsource: {
    /**
     * Fonts families lists
     */
    families: [
      // families can be either strings (load default font set)
      // Require the `@fontsource/abeezee` package to be installed.
      'ABeeZee',
      'Inter Variable', // Require the `@fontsource-variable/inter` package to be installed.
      {
        /**
         * Name of the font family.
         * Require the `@fontsource/roboto` package to be installed.
         */
        name: 'Roboto',
        /**
         * Load only a subset of the font family.
         */
        weights: [400, 700],
        /**
         * Restrict the font styles to load.
         */
        styles: ['italic', 'normal'],
        /**
         * Use another font subset.
         */
        subset: 'latin-ext',
      },
      {
        /**
         * Name of the font family.
         * Require the `@fontsource-variable/cabin` package to be installed.
         */
        name: 'Cabin',
        /**
         * When using variable fonts, you can choose which axes to load.
         */
        variable: {
          wght: true,
          slnt: true,
          ital: true,
        },

        /**
         * Generate a fallback @font-face to reduce layout shift.
         * See "Font Fallback Metrics" section for details.
         */
        fallback: {
          category: 'sans-serif',
        },
      },
    ],
  },
})
```

### Font Fallback Metrics

Reduce Cumulative Layout Shift (CLS) by generating fallback `@font-face` rules that adjust a local system font to match your web font's dimensions. Powered by [fontaine](https://github.com/unjs/fontaine).

When enabled on a font family, the plugin will:

1. Generate a companion `@font-face` with `size-adjust`, `ascent-override`, `descent-override`, and `line-gap-override` to morph a system font (e.g. Arial) to match the web font's size
2. Automatically rewrite `font-family` declarations in your CSS to include the fallback

This is opt-in per font family via the `fallback` option. It works with all providers:

```ts
Unfonts({
  google: {
    families: [
      {
        name: 'Roboto',
        styles: 'wght@400;700',
        // Enable fallback for this font
        fallback: {
          // Font category — used to pick appropriate system fonts
          // values: 'sans-serif' | 'serif' | 'monospace'
          // default: 'sans-serif'
          category: 'sans-serif',
        },
      },
      // String families are unaffected
      'Open Sans',
    ],
  },
  custom: {
    families: [{
      name: 'My Font',
      src: './src/assets/fonts/*.woff2',
      fallback: {
        // Explicitly choose which system fonts to use as fallback bases
        fallbacks: ['Arial', 'Helvetica Neue'],
        // Override the fallback font-face name (default: '{name} fallback')
        name: 'My Font Override',
      },
    }],
  },
  fontsource: {
    families: [{
      name: 'Inter',
      weights: [400, 700],
      fallback: {
        category: 'sans-serif',
      },
    }],
  },
  typekit: {
    id: '<projectId>',
    // Typekit requires declaring families to generate fallbacks
    families: [{
      name: 'Futura PT',
      fallback: {
        category: 'sans-serif',
      },
    }],
  },
})
```

The generated output looks like this:

```css
/* Generated fallback @font-face */
@font-face {
  font-family: "Roboto fallback";
  src: local("Arial");
  size-adjust: 100.06%;
  ascent-override: 92.77%;
  descent-override: 24.41%;
  line-gap-override: 0%;
}
```

And your CSS `font-family: 'Roboto', sans-serif` is automatically transformed to `font-family: 'Roboto', "Roboto fallback", sans-serif`.

#### Fallback options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `category` | `'sans-serif' \| 'serif' \| 'monospace'` | `'sans-serif'` | Font category, used to auto-select system fallback fonts |
| `fallbacks` | `string[]` | Auto-detected | Override which system fonts to use as fallback bases |
| `name` | `string` | `'{family} fallback'` | Override the generated fallback font-face name |

## Typescript Definitions

```json
{
  "compilerOptions": {
    "types": ["unplugin-fonts/client"]
  }
}
```

or

```ts
// declaration.d.ts
/// <reference types="unplugin-fonts/client" />
```

## Resources

- https://web.dev/optimize-webfont-loading/
- https://csswizardry.com/2020/05/the-fastest-google-fonts/
- https://github.com/unjs/fontaine - Font metric override library used for fallback generation
- _(unmaintained)_ https://www.npmjs.com/package/webfontloader
