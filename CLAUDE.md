# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev              # Start dev server (localhost:4321)
bun run build            # Build + post-build base path integrity check
bun run preview          # Preview production build
bun run check            # All checks: astro check + biome + rumdl
bun run check:astro      # TypeScript type checking (astro check)
bun run check:biome      # Lint + format check (JS/TS/CSS/HTML)
bun run check:markdown   # Lint Markdown files (rumdl)
bun run test             # Unit tests (vitest)
bun run fix:biome        # Auto-fix lint and formatting
bun run fix:markdown     # Format Markdown files (rumdl)
bun run generate:favicons # Regenerate favicons from public/assets/favicon.png
```

**External deps for sample content**: `typst` and `mmdr` must be in PATH for math/diagram compilation during build. If sample posts with math/diagrams are removed, these are not needed.

## Package Manager

Bun >= 1.3.11. Do not use npm or yarn.

## Linting & Formatting

- **Biome** (`biome.json`) for JS/TS/CSS/HTML: 2-space indent, double quotes, auto-organized imports. Two files exempt from `noImportantStyles`: `src/styles/global.css` and `src/components/blog/ArtalkComments.astro`.
- **rumdl** (`.rumdl.toml`) for Markdown: disabled MD013 (line length), MD036 (emphasis as heading), MD041 (first line heading). Showcase demo posts also exempt from MD025 (multiple H1) and MD033 (inline HTML) via per-file ignores. Unordered lists use dash style, indent 2.

## Architecture

### Theme Config (3-layer merge)

1. `src/config/theme-default.ts` — `SiteConfig` type definition + defaults
2. `src/site/config.ts` — user-owned overrides (this is the customization surface)
3. `src/config/site.ts` — merges defaults + user overrides + `SITE_CONFIG_OVERRIDES` env var, exports `siteConfig` singleton and `siteUrl`

### Content Collections (`src/content.config.ts`)

Three glob-loaded collections: `blog`, `series`, `about`. Blog uses `slug` (not file path) as URL identifier — the glob loader reads frontmatter `slug` to build the entry id. Post visibility: `public` / `unlisted` / `draft`. `unlisted` posts get built pages (direct-link reachable) but are excluded from the sitemap via `src/config/sitemap-filter.ts`.

### Markdown Pipeline (`src/markdown/`)

Remark/rehype plugins handle math, diagrams, reading time, image captions, and heading IDs. Code blocks use a custom `<code-block>` HTML element (not standard HTML) with structured children (header, scroller, template). Shiki transformers + `createCodeBlockChrome` produce this element automatically.

Math (Typst) and diagrams (Typst/Mermaid) are **compiled at build time** to SVG assets, not rendered in-browser. Asset names are content-addressed (SHA-256 of `version:language:source`), where `version` combines `MARKDOWN_PIPELINE_VERSION` with the probed `typst`/`mmdr` binary versions (`resolveAssetVersion`) — upgrading a renderer automatically changes asset URLs. Assets are served via dynamic routes under `/assets/math/` and `/assets/diagrams/`.

Compile results are cached on disk in `node_modules/.cache/vellume-render` (keyed by toolchain versions + source), so unchanged formulas/diagrams skip re-spawning the binaries across builds. The markdown plugins also compile during transforms to read SVG intrinsic sizes and emit `width`/`height` on `<img>` (prevents layout shift); compile failures fall back to dimension-less imgs and the endpoint then serves an error SVG.

### Styling

Tailwind CSS v4 with `@import "tailwindcss"` syntax. Main stylesheet: `src/styles/global.css`. Dark mode uses `[data-theme="dark"]` attribute (not `prefers-color-scheme`), toggled via `astro-theme-toggle`. Design tokens defined as CSS custom properties and mapped to Tailwind's `--color-*`/`--font-*` namespaces via `@theme inline`. User overrides go in `src/site/theme.css`.

### User-Owned Customization Surface

These paths should be preferred for user edits; upstream changes belong everywhere else:

- `src/content/**` — posts, series, about page
- `src/site/config.ts` — site identity, links, comments, feed settings
- `src/site/navigation.ts` — header/footer nav items
- `src/site/theme.css` — design token overrides
- `src/site/custom.css` — component-level CSS escape hatch

### Client Scripts (`src/scripts/`)

All use a `runOnPageLoad` pattern: each script module self-registers a callback keyed by ID on import. `astro:page-load` dispatches all; `astro:before-swap` resets state. Cleanup via `AbortController`. Artalk is dynamically imported only when a comments host exists, so pages with comments disabled never load it.

### Base Path System

`src/utils/base-path-core.ts` provides pure `withBasePathUsing`/`withoutBasePathUsing`. `src/utils/paths.ts` wraps these with Astro's `import.meta.env.BASE_URL`. CI sets `SITE_BASE=/astro-theme-vellume`. Post-build `check:base` script validates output paths.

### Data Access

`src/lib/blog/index.ts` is the data layer: post queries, series helpers, tag counts, post grouping and adjacency. Pages should query through this module rather than calling content collection loaders directly.

## Language & Locale

UI is Chinese (zh-CN). Default site lang is `zh-CN`, date formatting uses `zh-CN` locale. Reading time supports both CJK (500 chars/min) and Latin (200 words/min).

## TypeScript

Strict mode via `astro/tsconfigs/strict`. Path alias: `@/*` maps to `./src/*`.
