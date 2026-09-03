# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev              # Start dev server (localhost:4321)
bun run build            # Build + post-build base path check (check:base)
bun run preview          # Preview production build
bun run check            # All checks: astro check + biome + rumdl
bun run check:astro      # TypeScript type checking (astro check)
bun run check:biome      # Lint + format check (JS/TS/CSS/HTML)
bun run check:markdown   # Lint Markdown files (rumdl)
bun run check:base       # Post-build base-path integrity (SITE_BASE)
bun run test             # Unit tests (vitest)
bun run fix:biome        # Auto-fix lint and formatting
bun run fix:markdown     # Format Markdown files (rumdl)
bun run generate:favicons # Regenerate favicons from public/assets/favicon.png
bun run sync             # One-way downstream merge: main → blog branch (scripts/sync-upstream.ts)
```

**External deps for sample content**: `typst` and `mmdr` must be in PATH for math/diagram compilation during build. If sample posts with math/diagrams are removed, these are not needed.

## Package Manager

Bun >= 1.3.11. Do not use npm or yarn.

## Linting & Formatting

- **Biome** (`biome.json`) for JS/TS/CSS/HTML: 2-space indent, double quotes, auto-organized imports. `src/styles/**/*.css` and `src/components/blog/ArtalkComments.astro` are exempt from `noImportantStyles` via `overrides`.
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

Tailwind CSS v4 with `@import "tailwindcss"` syntax. Main stylesheet: `src/styles/global.css`, which imports the concern partials in cascade order (tokens → base → components → prose → code-block → transitions → utilities → toc → print; toc/transitions/print are deliberately unlayered so they outrank layered rules). The active screen skin's css is injected between global.css and the user files via the `vellume-skins` virtual module (Vite plugin in astro.config.ts), so bundle order enforces the precedence chain tokens.css < profile skin < print template < theme.css < custom.css. Dark mode uses `[data-theme="dark"]` attribute (not `prefers-color-scheme`), toggled via `astro-theme-toggle`; every dark token block (tokens.css, skin files, code-block.css) is gated inside `@media screen` (skin dark blocks textually, at build time), so print media always renders light values. Design tokens are CSS custom properties mapped to Tailwind's `--color-*`/`--font-*` namespaces via `@theme inline`. User overrides go in `src/site/theme.css`.

Token conventions: colors follow the shadcn semantic set (`background/foreground/muted/border/primary/accent/card/popover/secondary/input/ring/destructive`) plus a surface ladder (`--background` page canvas → `--surface` content sheet consumed by header/main/footer → `--card` raised elements); radii use the derived ladder `--radius-tight/control/inner/card/hero` (badges → buttons → rows → cards → hero panels) — pick the step by element role, never a raw value; focus rings go through `--ring`. Derived tokens re-derive from their bases via `color-mix` (accent/ring/container ladder/code-block chrome/hero particles all follow `--primary`), with per-mode mix strengths exposed as `--accent-strength`/`--container-*-strength`/`--ring-strength`. State feedback is a tonal fill (`--container-faint*`/`--container-subtle`), never a border flip or shadow lift — borderless is the default for utility controls (copy, TOC actions, toggles, heading anchors); outline variants are for content actions (votes, segmented tracks).

### Skins & Print

One screen skin = one css file under `src/site/profiles/` (light `:root` block + dark `[data-theme="dark"]` block written as a pair, optional structural rules) plus a typed registration in `src/config/theme-profiles.ts` (`skins`: file + `meta` branding for the non-CSS color consumers — browserColor, OG palette, mermaid themeVariables — resolved by `resolveThemeBranding()`; explicit user config outranks skin meta, which outranks `theme-default.ts` defaults). `theme.profile` picks THE screen skin for the whole site at build time (no visitor-side switching); unknown names warn and fall back to `default`. `theme.print` names a print template from the `printTemplates` registry (thesis is the shipped one and the default — it is intentionally NOT a screen skin, so it cannot be `profile`; set `print: ""` to disable). `buildSkinCss(config?)` emits the active profile's file (dark blocks textually wrapped in `@media screen` — the gate also makes empty default.css emit nothing) plus, when `theme.print` is set (default `thesis`), the print template's whole file inside `@media print`. No data-skin scoping exists anymore: exactly one screen skin is built, and the cascade is purely order-based — tokens.css < profile skin < print template < theme.css < custom.css.

Dark tokens: a dark block must anchor its selector (`[data-theme="dark"]` first, or right after `:root`/`html`); mid-selector or mixed-list dark styling is a build error (it would leak dark values into print). A screen skin's `:root` outranks tokens.css's dark block at equal specificity in dark mode, so tokens that must flip dark are re-declared inside the skin's own dark block (e.g. material's `--code-block-surface`).

Print styling is a single fixed floor in `src/styles/print.css` (plain `@media print`): hide chrome, flatten to one column, wrap code instead of scrolling, expand non-anchor content links as footnotes (excluding `mailto:`/`tel:`), force white paper, pagination hygiene. The `theme.print` layer (default `thesis`) is injected after it (virtual module between global.css and theme.css), so the template's paper typography (serif/indents/centred titles/chapter breaks) overrides the floor's flattening; with `print: ""` disabled, the profile skin's light half carries into paper. See `docs/theming.md`.

Typography conventions: CJK↔Latin auto-spacing via the two-line `text-autospace` layering in base.css (do not collapse it — the order carries the cross-implementation fallback); headings use `text-wrap: balance`, prose paragraphs use `pretty`; `--font-mono` is the canonical system stack, reserve mono for code, language labels, and the `#` heading anchors. The prose wrapper only ever has the class `rich-prose` (never a literal `prose` class), so `.prose`-prefixed rules are dead — style prose elements under `.rich-prose` in utilities.css; rules conflicting with the typography plugin double the class (`.rich-prose.rich-prose`) to win on specificity.

### User-Owned Customization Surface

These paths should be preferred for user edits; upstream changes belong everywhere else:

- `src/content/**` — posts, series, about page
- `src/site/config.ts` — site identity, links, comments, feed settings
- `src/site/metadata.ts` — site URL/title/description + favicon defaults
- `src/site/navigation.ts` — header/footer nav items
- `src/site/theme.css` — design token overrides
- `src/site/custom.css` — component-level CSS escape hatch
- `src/site/profiles/**` — your added skins (one CSS file + one registration in `src/config/theme-profiles.ts`)

`bun run sync` auto-resolves along the same boundary (`--ours` for `src/content/**` + `src/site/*`, `--theirs` for `src/components/**`/`src/layouts/**`/`src/pages/**`/`src/styles/**`/etc. — see README Updating From Upstream).

### Client Scripts (`src/scripts/`)

All use a `runOnPageLoad` pattern: each script module self-registers a callback keyed by ID on import. `astro:page-load` dispatches all; `astro:before-swap` resets state. Cleanup via `AbortController`. Artalk is dynamically imported only when a comments host exists, so pages with comments disabled never load it. Presentation-only injectors follow the same pattern — `heading-anchors.ts` adds `.heading-anchor` permalinks into `.rich-prose` headings (their styles live in utilities.css; the elements exist only after hydration).

### Base Path System

`src/utils/base-path-core.ts` provides pure `withBasePathUsing`/`withoutBasePathUsing`. `src/utils/paths.ts` wraps these with Astro's `import.meta.env.BASE_URL`. `bun run build` chains `astro build` + `bun run check:base`; when `SITE_BASE=/astro-theme-vellume` (CI/GitHub Pages) the `check:base` script validates that every absolute `href/src/content` in `dist` stays under that base (no stray `/assets/...` outside it). You can also run `bun run check:base` standalone after a build.

### Data Access

`src/lib/blog/index.ts` is the data layer: post queries, series helpers, tag counts, post grouping and adjacency. Pages should query through this module rather than calling content collection loaders directly.

## Language & Locale

UI is Chinese (zh-CN). Default site lang is `zh-CN`, date formatting uses `zh-CN` locale. Reading time supports both CJK (500 chars/min) and Latin (200 words/min).

## TypeScript

Strict mode via `astro/tsconfigs/strict`. Path alias: `@/*` maps to `./src/*`.
