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

Tailwind CSS v4 with `@import "tailwindcss"` syntax. Main stylesheet: `src/styles/global.css`, which imports the concern partials in cascade order (tokens → base → components → prose → code-block → transitions → utilities → toc → print; toc/transitions/print are deliberately unlayered so they outrank layered rules). Every registered skin's css is injected between global.css and the user files via the `vellume-skins` virtual module (Vite plugin in astro.config.ts), :where-scoped per skin, so bundle order enforces the precedence chain tokens.css < skins < theme.css < custom.css with no specificity competition. Dark mode uses `[data-theme="dark"]` attribute (not `prefers-color-scheme`), toggled via `astro-theme-toggle`; every dark token block (tokens.css, skin files, code-block.css) is gated inside `@media screen` (skin dark blocks textually, at build time), so print media always renders light values. Design tokens are CSS custom properties mapped to Tailwind's `--color-*`/`--font-*` namespaces via `@theme inline`. User overrides go in `src/site/theme.css`.

Token conventions: colors follow the shadcn semantic set (`background/foreground/muted/border/primary/accent/card/popover/secondary/input/ring/destructive`) plus a surface ladder (`--background` page canvas → `--surface` content sheet consumed by header/main/footer → `--card` raised elements); radii use the derived ladder `--radius-tight/control/inner/card/hero` (badges → buttons → rows → cards → hero panels) — pick the step by element role, never a raw value; focus rings go through `--ring`. Derived tokens re-derive from their bases via `color-mix` (accent/ring/container ladder/code-block chrome/hero particles all follow `--primary`), with per-mode mix strengths exposed as `--accent-strength`/`--container-*-strength`/`--ring-strength`. State feedback is a tonal fill (`--container-faint*`/`--container-subtle`), never a border flip or shadow lift — borderless is the default for utility controls (copy, TOC actions, toggles, heading anchors); outline variants are for content actions (votes, segmented tracks).

### Skins & Print

One skin = one css file under `src/site/profiles/` (light `:root` block, dark `[data-theme="dark"]` block, optional structural rules) plus a small typed registration in `src/config/theme-profiles.ts` (`skins`: file, menu label, `meta` branding for the non-CSS color consumers — browserColor, shiki themes, OG palette, mermaid themeVariables — resolved by `resolveThemeBranding()`; explicit user config outranks skin meta, which outranks `theme-default.ts` defaults). `theme.profile` selects the server-side default skin; unknown names warn and fall back to `default`. The system is semantic-free: `buildSkinCss()` emits EVERY registered skin scoped by zero-specificity `:where([data-skin="<name>"])` (selector rewrite via lightningcss; dark blocks additionally wrapped in `@media screen`), so skins never win a specificity fight — cascade order alone decides.

Skins switch at runtime via the `data-skin` root attribute: the header/drawer `SkinSwitcher.astro` + `scripts/ui/skin-switcher.ts` write the attribute and persist to localStorage (`vellume-skin`); an inline head bootstrap in BaseLayout restores it before first paint (validating against registered names), and the `astro:before-swap` handler migrates it alongside `data-theme`.

Optional per-mode slots layer on top of `profile`: `theme.dark` (use another skin's dark half in dark mode) and `theme.print` (always print with a skin's light presentation). `theme.dark` emits the slot skin's dark blocks scoped to `data-skin-dark` (injected after the skins layer); every skin's own dark blocks in the screen layer carry a zero-specificity `:not([data-skin-dark])` guard so they yield to the slot. `theme.print` wraps the slot skin's whole file in `@media print` (ungated — printing is publisher intent). The server stamps `data-skin-dark` when a dark slot is configured; a visitor skin pick deletes it (a picked skin owns both modes), the bootstrap deletes it when a stored pick exists, and `astro:before-swap` mirrors it. `browserColor`/shiki dark halves follow the dark slot; OG/mermaid (single-look build artifacts) follow `profile`. Unknown slot names warn once and disable the slot. See `docs/theming.md` "模式槽位".

Print styling is a single fixed floor in `src/styles/print.css` (plain `@media print`): hide chrome, flatten to one column, wrap code instead of scrolling, expand non-anchor content links as footnotes (excluding `mailto:`/`tel:`), force white paper, pagination hygiene. A `theme.print` slot layer (if configured) is injected before it; without a slot, a skin's typography (e.g. thesis's serif/indents/centred titles and its own `@media print` chapter breaks) carries into paper via its light half. The article title's three-dot menu (`ArticleActions.astro`) prints via `window.print()`. See `docs/theming.md`.

Typography conventions: CJK↔Latin auto-spacing via the two-line `text-autospace` layering in base.css (do not collapse it — the order carries the cross-implementation fallback); headings use `text-wrap: balance`, prose paragraphs use `pretty`; `--font-mono` is the canonical system stack, reserve mono for code, language labels, and the `#` heading anchors. The prose wrapper only ever has the class `rich-prose` (never a literal `prose` class), so `.prose`-prefixed rules are dead — style prose elements under `.rich-prose` in utilities.css; rules conflicting with the typography plugin double the class (`.rich-prose.rich-prose`) to win on specificity.

### User-Owned Customization Surface

These paths should be preferred for user edits; upstream changes belong everywhere else:

- `src/content/**` — posts, series, about page
- `src/site/config.ts` — site identity, links, comments, feed settings
- `src/site/navigation.ts` — header/footer nav items
- `src/site/theme.css` — design token overrides
- `src/site/custom.css` — component-level CSS escape hatch

### Client Scripts (`src/scripts/`)

All use a `runOnPageLoad` pattern: each script module self-registers a callback keyed by ID on import. `astro:page-load` dispatches all; `astro:before-swap` resets state. Cleanup via `AbortController`. Artalk is dynamically imported only when a comments host exists, so pages with comments disabled never load it. Presentation-only injectors follow the same pattern — `heading-anchors.ts` adds `.heading-anchor` permalinks into `.rich-prose` headings (their styles live in utilities.css; the elements exist only after hydration).

### Base Path System

`src/utils/base-path-core.ts` provides pure `withBasePathUsing`/`withoutBasePathUsing`. `src/utils/paths.ts` wraps these with Astro's `import.meta.env.BASE_URL`. CI sets `SITE_BASE=/astro-theme-vellume`. Post-build `check:base` script validates output paths.

### Data Access

`src/lib/blog/index.ts` is the data layer: post queries, series helpers, tag counts, post grouping and adjacency. Pages should query through this module rather than calling content collection loaders directly.

## Language & Locale

UI is Chinese (zh-CN). Default site lang is `zh-CN`, date formatting uses `zh-CN` locale. Reading time supports both CJK (500 chars/min) and Latin (200 words/min).

## TypeScript

Strict mode via `astro/tsconfigs/strict`. Path alias: `@/*` maps to `./src/*`.
