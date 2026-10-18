# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [2.0.0](https://github.com/stafyniaksacha/unplugin-fonts/compare/v1.4.0...v2.0.0) (2026-04-06)


### ⚠ BREAKING CHANGES

* drop cjs export. migrate to tsdown and tsgo

### Features

* add bun, rolldown and rspack loaders ([0802a9c](https://github.com/stafyniaksacha/unplugin-fonts/commit/0802a9c5e1326474a02bb6dca33e2a91a98568a6))
* add font fallback metrics to reduce layout shift ([5cdfe70](https://github.com/stafyniaksacha/unplugin-fonts/commit/5cdfe705481792053e45148e1834832b5bf363a0))
* add inline font face option to improve LCP by inlining [@font-face](https://github.com/font-face) rules ([9766b0e](https://github.com/stafyniaksacha/unplugin-fonts/commit/9766b0e5ab4e6133c0624c77289616cf3db2e91b))
* add Vite 8 support ([#92](https://github.com/stafyniaksacha/unplugin-fonts/issues/92)) ([a2c0a0a](https://github.com/stafyniaksacha/unplugin-fonts/commit/a2c0a0a15d869f3e9df714a984266a1a4fd348e0))
* allow passing range for custom font-weight ([#79](https://github.com/stafyniaksacha/unplugin-fonts/issues/79)) ([a6db654](https://github.com/stafyniaksacha/unplugin-fonts/commit/a6db654efe589f8445e50afec91dff6a8140b97b))
* **fallback:** optimize fallback generation by checking for configured fallbacks before processing ([71ac94e](https://github.com/stafyniaksacha/unplugin-fonts/commit/71ac94e98bd6433723b2dcd142d7a2d411ea5b6e))
* **tests:** add comprehensive tests for fontsource, custom, google, and typekit loaders ([c4933a0](https://github.com/stafyniaksacha/unplugin-fonts/commit/c4933a0c8b020c23f6340451300c48f786f77320))


### Bug Fixes

* **fontsource:** update variable standard and stylesheet import path ([623abd6](https://github.com/stafyniaksacha/unplugin-fonts/commit/623abd6b124ffc4d006feee2e74093cae90dcb21))


* drop cjs export. migrate to tsdown and tsgo ([79a8106](https://github.com/stafyniaksacha/unplugin-fonts/commit/79a81066a7e981c3bebe5844912b0635cd2699c5))

## [1.4.0](https://github.com/stafyniaksacha/unplugin-fonts/compare/v1.3.1...v1.4.0) (2025-07-22)


### Features

* add Vite 7 support ([#87](https://github.com/stafyniaksacha/unplugin-fonts/issues/87)) ([587f506](https://github.com/stafyniaksacha/unplugin-fonts/commit/587f506c239bb4fe7e61f18fbf8a1b9b57ce1570))
* allow using nuxt 4 ([0b088c7](https://github.com/stafyniaksacha/unplugin-fonts/commit/0b088c7755e3d2f6b66a318f35f5ecb66eb61bdf))


### Bug Fixes

* improve vite 7 plugin typing ([2b8f001](https://github.com/stafyniaksacha/unplugin-fonts/commit/2b8f001fca2cb8babb0c81557b70daba600df78a))
* loading custom font in nuxt module ([d562a89](https://github.com/stafyniaksacha/unplugin-fonts/commit/d562a892feef5ea2e839c85f1df52311532c9fc9))

### [1.3.1](https://github.com/stafyniaksacha/unplugin-fonts/compare/v1.3.0...v1.3.1) (2024-12-01)


### Bug Fixes

* link filter types ([5881d7c](https://github.com/stafyniaksacha/unplugin-fonts/commit/5881d7ce2bd08ac5f0dcb8a449fa59e0fabf6ffd))

## [1.3.0](https://github.com/stafyniaksacha/unplugin-fonts/compare/v1.2.0...v1.3.0) (2024-12-01)


### Features

* introduce link tag filter hook ([#71](https://github.com/stafyniaksacha/unplugin-fonts/issues/71)) ([6b61890](https://github.com/stafyniaksacha/unplugin-fonts/commit/6b61890952fa61501eb93296a445657fb1ac8bcb)), closes [#70](https://github.com/stafyniaksacha/unplugin-fonts/issues/70) [#7](https://github.com/stafyniaksacha/unplugin-fonts/issues/7) [#10](https://github.com/stafyniaksacha/unplugin-fonts/issues/10)


### Bug Fixes

* google font missing injectTo ([#75](https://github.com/stafyniaksacha/unplugin-fonts/issues/75)) ([4107af6](https://github.com/stafyniaksacha/unplugin-fonts/commit/4107af60674701c513cf11388c459e0363a831b3))

## [1.2.0](https://github.com/stafyniaksacha/unplugin-fonts/compare/v1.1.1...v1.2.0) (2024-12-01)


### Features

* add fontBaseUrl and preconnectUrl on google font provider ([12684bc](https://github.com/stafyniaksacha/unplugin-fonts/commit/12684bc134737304baadde2aa9a3bfb2f8640742)), closes [#78](https://github.com/stafyniaksacha/unplugin-fonts/issues/78)
* add fontBaseUrl on typekit font provider ([724026b](https://github.com/stafyniaksacha/unplugin-fonts/commit/724026b4bb3be0233347310a0b3b0527a9747c70))
* support vite 6.0 ([#77](https://github.com/stafyniaksacha/unplugin-fonts/issues/77)) ([38332ba](https://github.com/stafyniaksacha/unplugin-fonts/commit/38332baad92a4b8f405a062242abc97f6e5a99b2))

### [1.1.1](https://github.com/stafyniaksacha/unplugin-fonts/compare/v1.1.0...v1.1.1) (2023-11-22)


### Bug Fixes

* build issue, importMap export ([ba7d88b](https://github.com/stafyniaksacha/unplugin-fonts/commit/ba7d88b2d55390c5828d306eb9992c8026a67f02))

## [1.1.0](https://github.com/stafyniaksacha/unplugin-fonts/compare/v1.0.3...v1.1.0) (2023-11-22)


### Features

* add support to fontsource variable v5 ([a17831d](https://github.com/stafyniaksacha/unplugin-fonts/commit/a17831d213ef3cf207f481bed7202526d7e235d4)), closes [#60](https://github.com/stafyniaksacha/unplugin-fonts/issues/60) [#57](https://github.com/stafyniaksacha/unplugin-fonts/issues/57)
* improve local file preload for vite and vitepress ([10d7067](https://github.com/stafyniaksacha/unplugin-fonts/commit/10d7067a98dae5b054e90e22922d3a0f471358c6))
* vite 5 compatibility ([15ea829](https://github.com/stafyniaksacha/unplugin-fonts/commit/15ea8291b9db79cf1ffd5dc7b4ceba8650e39a93))


### Bug Fixes

* bug in `fontsource.ts` when style is normal ([#52](https://github.com/stafyniaksacha/unplugin-fonts/issues/52)) ([1253f4d](https://github.com/stafyniaksacha/unplugin-fonts/commit/1253f4d4604e4a8b80bc342e252c17911fc439dc))
* **nuxt:** fontsource loading and custom font preloading ([5260277](https://github.com/stafyniaksacha/unplugin-fonts/commit/5260277b85fb92c64217a8a6ba4519637bc5f6bc))

### [1.0.3](https://github.com/stafyniaksacha/unplugin-fonts/compare/v1.0.2...v1.0.3) (2023-04-15)


### Bug Fixes

* **fontsource:** slugify family name to match package ([570ea24](https://github.com/stafyniaksacha/unplugin-fonts/commit/570ea24fe93341ed27f7178a2d46081cc0bc020e))
* **nuxt:** only load unfonts.css when necessary ([0c6bd30](https://github.com/stafyniaksacha/unplugin-fonts/commit/0c6bd30d77200675cda3eba20ec6370b2ee8a6e0))
* optionally generate sourcemap ([e6c5ffb](https://github.com/stafyniaksacha/unplugin-fonts/commit/e6c5ffbfbf9363563105c1e92e4e1a31ef8f138b))

### [1.0.2](https://github.com/stafyniaksacha/unplugin-fonts/compare/v1.0.1...v1.0.2) (2023-04-14)


### Bug Fixes

* Ressources typo in README ([0d41492](https://github.com/stafyniaksacha/unplugin-fonts/commit/0d41492ab70327d0b7afd609a30a59ae916107cf))

### [1.0.1](https://github.com/stafyniaksacha/unplugin-fonts/compare/v1.0.0...v1.0.1) (2023-04-14)


### Bug Fixes

* update dependencies ([2d75cbb](https://github.com/stafyniaksacha/unplugin-fonts/commit/2d75cbbface8a8ba5c4b2512da6995a54e850a92))

## [1.0.0](https://github.com/stafyniaksacha/unplugin-fonts/compare/v1.0.0-beta.1...v1.0.0) (2023-03-20)


### Bug Fixes

* exported links typing ([07b6e11](https://github.com/stafyniaksacha/unplugin-fonts/commit/07b6e113032506716f229cd46baa421c88a5598a))

## [1.0.0-beta.1](https://github.com/stafyniaksacha/unplugin-fonts/compare/v1.0.0-beta.0...v1.0.0-beta.1) (2023-03-20)

## [1.0.0-beta.0](https://github.com/stafyniaksacha/unplugin-fonts/compare/v0.7.0...v1.0.0-beta.0) (2023-03-19)


### ⚠ BREAKING CHANGES

- rename virtual "virtual:fonts.css" to "unfonts.css"
- rename package "vite-plugin-fonts" to "unplugin-fonts"

### Features

* add astro component ([a31f167](https://github.com/stafyniaksacha/unplugin-fonts/commit/a31f16765e685cdcc37960f001d0ef1822b22e75))
* add custom font transformer ([05e339a](https://github.com/stafyniaksacha/unplugin-fonts/commit/05e339aa026e469d01a14a2334c3cb1bda2ac432))
* add fontsource font provider ([9cfa836](https://github.com/stafyniaksacha/unplugin-fonts/commit/9cfa8362d253053488c07bd10f4b323d682370b5))
* add fontsource provider ([e62f9c7](https://github.com/stafyniaksacha/unplugin-fonts/commit/e62f9c76e6a21b7957a3c22497496e1d79971904))
* add vitepress and sveltkit examples ([959914e](https://github.com/stafyniaksacha/unplugin-fonts/commit/959914e6beb36af9d82ac8b50a654fb02c0c8960))
* expose typescript declaration ([f3f2276](https://github.com/stafyniaksacha/unplugin-fonts/commit/f3f22766e9a95dd9c1518b329aeaa1c217e515dd))
* migrate plugin to unplugin ([5ae235a](https://github.com/stafyniaksacha/unplugin-fonts/commit/5ae235ac8db5b571634961c8ac85d1a5d6d333b7))


### Bug Fixes

* allow loading unfont.css with query ([9006d78](https://github.com/stafyniaksacha/unplugin-fonts/commit/9006d7820607adf96de1c14ad842c234ad6eb9f7))

## [0.7.0](https://github.com/stafyniaksacha/unplugin-fonts/compare/v0.6.0...v0.7.0) (2022-12-09)


### Features

* add vite 4 to peer dependencies version ([60bae97](https://github.com/stafyniaksacha/unplugin-fonts/commit/60bae97fcad268c73009c9950f07ce05ed50b785))
