import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "lightningcss";
import { rawSiteConfigInput, siteConfig } from "./site";
import {
  isPlainObject,
  type SiteConfig,
  type SiteConfigInput,
  themeDefaultConfig,
} from "./theme-default";

/**
 * The look system: `theme.profile` picks ONE css file for the whole site
 * (screen light + dark halves), and `theme.print` may pick a print template
 * used whenever the page is printed. There is no visitor-side skin
 * switching — the owner's choice is baked in at build time.
 *
 * Files live under `src/site/profiles/`. The `skins` registry holds the
 * screen looks (default = tokens.css itself, material); `printTemplates`
 * holds the files that only make sense on paper (thesis). thesis is not a
 * screen skin: screen skins stay paired (light + dark halves written
 * together), and thesis exists to be printed on top of any screen skin.
 *
 * The build emits:
 * - the profile's file, dark blocks wrapped in `@media screen` so paper
 *   always renders the light values;
 * - the print template's whole file inside `@media print` (default
 *   `thesis`), so printing follows the paper template regardless of screen
 *   look (set `theme.print: ""` to disable).
 *
 * Emitted css is unconstrained by `data-skin` (nothing switches skins at
 * runtime); cascade precedence stays purely order-based:
 * tokens.css < profile skin < print template < theme.css < custom.css.
 * See docs/theming.md.
 */

/* Resolved from this module's own URL, not the process cwd, so Node-side
   consumers (astro.config.ts, the favicon script) resolve it the same way
   no matter where they are invoked from. */
export const skinsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../site/profiles",
);

/** Non-CSS color consumers that follow the chosen screen skin. Each field
 * is a default that explicit user config (src/site/config.ts) outranks. */
export interface SkinBranding {
  browserColor?: { light: string; dark: string };
  shiki?: { light: string; dark: string };
  og?: {
    accent?: SiteConfig["og"]["accent"];
    backgroundGradient?: SiteConfig["og"]["backgroundGradient"];
    description?: SiteConfig["og"]["description"];
    border?: SiteConfig["og"]["border"]["color"];
  };
  /** Mermaid themeVariables; mmdr's schema wants numeric values for
   * quantitative entries (fontSize) and strings for colors. */
  mermaid?: Record<string, string | number>;
}

/** One screen skin = one css file plus its typed metadata. */
export interface SkinRegistration {
  /** css file path relative to `src/site/profiles/`. */
  file: string;
  /** Branding defaults for the non-CSS color consumers. */
  meta?: SkinBranding;
}

/**
 * Baseline branding for the default skin. Its css file stays empty
 * (tokens.css is the default look); meta carries the non-CSS consumers whose
 * defaults have no other single home.
 */
const defaultBranding: Required<Pick<SkinBranding, "shiki" | "mermaid">> = {
  shiki: { light: "github-light", dark: "github-dark-default" },
  mermaid: {
    primaryColor: "#FFFFFF",
    primaryTextColor: "#131313",
    primaryBorderColor: "#cccccc",
    lineColor: "#555555",
    secondaryColor: "#F0F4FF",
    tertiaryColor: "#E8EEFF",
    edgeLabelBackground: "#ffffff",
    clusterBkg: "#F8FAFF",
    clusterBorder: "#cccccc",
    background: "#FFFFFF",
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif',
    /* mmdr's config schema wants a float here; a string fails the whole
       compile (serde: invalid type: string, expected f32). */
    fontSize: 13,
  },
};

/** The screen-skin registry: one css file per skin. `theme.profile` picks
 * one of these; adding a skin means dropping a file into
 * `src/site/profiles/` and registering it here. */
export const skins = {
  /* The shipped look: zinc greys, single blue accent (tokens.css itself). */
  default: {
    file: "default.css",
    meta: defaultBranding,
  },

  /* Layered sheet layout: grey canvas, near-white content sheet, green
     accent, rounder corners; title and body share one article card
     (screen-only structural rule). */
  material: {
    file: "material.css",
    meta: {
      browserColor: { light: "#eaf0eb", dark: "#121411" },
      og: {
        accent: [105, 189, 117],
        backgroundGradient: [
          [22, 27, 22],
          [12, 15, 12],
        ],
        description: [138, 148, 140],
        border: [105, 189, 117],
      },
      mermaid: {
        secondaryColor: "#EDF5EE",
        tertiaryColor: "#E2F0E4",
        clusterBkg: "#F3F9F4",
      },
    },
  },
} satisfies Record<string, SkinRegistration>;

export type SkinName = keyof typeof skins;

/* Explicit annotation: entries of the satisfies-typed literal carry the
   per-entry literal types, which optional-field reads cannot see. */
const skinEntries: [string, SkinRegistration][] = Object.entries(skins);

/** Print templates: css files usable via `theme.print`. thesis is the
 * shipped paper template. A screen skin printed without a slot already
 * renders its own light half, so screen skins are intentionally not listed
 * here. */
export const printTemplates = {
  /* Paper typesetting on plain white: serif body with justified indented
     paragraphs, heiti section titles, three-line tables, chromeless code
     and diagram panels, and a compact print rhythm. Its screen look (the
     WYSIWYG paper) never ships; only its @media print output is used. */
  thesis: { file: "thesis.css" },
} satisfies Record<string, { file: string }>;

export type PrintTemplateName = keyof typeof printTemplates;

const printTemplateEntries: [string, { file: string }][] =
  Object.entries(printTemplates);

export interface ResolvedSkin {
  name: string;
  registration: SkinRegistration;
}

export function resolveSkin(config: SiteConfig = siteConfig): ResolvedSkin {
  const name = config.theme.profile || "default";
  const found = skinEntries.find(([key]) => key === name);
  if (found) {
    return { name: found[0], registration: found[1] };
  }
  console.warn(
    `[vellume] Unknown skin "${name}"; falling back to "default". Known skins: ${Object.keys(skins).join(", ")}.`,
  );
  return { name: "default", registration: skins.default };
}

/* The print slot warns once per name; resolveThemeBranding resolves per
   page render, so an unknown value must not spam the build log. */
const warnedPrintNames = new Set<string>();

/**
 * Resolve the optional `theme.print` slot. Unset/empty or unknown names
 * return undefined, which disables the slot (print then follows the active
 * skin's light half). The built-in default is `thesis` (see
 * `themeDefaultConfig`).
 */
export function resolvePrintTemplate(
  config: SiteConfig = siteConfig,
): { name: string; file: string } | undefined {
  const name = config.theme.print;
  if (!name) return undefined;
  const found = printTemplateEntries.find(([key]) => key === name);
  if (found) {
    return { name: found[0], file: found[1].file };
  }
  const warningKey = `print:${name}`;
  if (!warnedPrintNames.has(warningKey)) {
    warnedPrintNames.add(warningKey);
    console.warn(
      `[vellume] Unknown print template "${name}"; ignoring theme.print. Known templates: ${Object.keys(printTemplates).join(", ")}.`,
    );
  }
  return undefined;
}

function readLookCss(file: string): string {
  return readFileSync(path.join(skinsDir, file), "utf8");
}

/* ── Look css transform ────────────────────────────────────────────────
 *
 * Emitted css is consumed verbatim by the browser, so every rewrite is a
 * real CSS parse (lightningcss), not text rewriting.
 *
 * - Dark blocks (selectors anchored on `[data-theme="dark"]`, optionally
 *   through `:root`/`html`) are wrapped in `@media screen` TEXTUALLY, using
 *   source ranges located by the parser. Text wrapping keeps the block
 *   byte-identical: comments survive, and var()-bearing declarations never
 *   round-trip through the napi bindings (which cannot deserialize them
 *   back into Rust). Dark blocks nested inside an authored @media keep that
 *   block's own media context and are not gated.
 * - The print layer wraps the whole template file inside `@media print`;
 *   its own dark blocks stay inside their nested screen gate (inert in
 *   print), and its own @media print rules nest harmlessly.
 * - No data-skin scoping: exactly one screen skin is built in, and printing
 *   is owner intent — the cascade is purely order-based.
 */

interface CssRange {
  start: number;
  /** Index of the rule's closing `}` (inclusive). */
  end: number;
}

interface SimpleComponent {
  type: string;
  name?: string;
  kind?: string;
  operation?: { operator?: string; value?: string } | null;
}

const isDarkAttribute = (component: SimpleComponent): boolean =>
  component.type === "attribute" &&
  component.name === "data-theme" &&
  component.operation?.operator === "equal" &&
  component.operation?.value === "dark";

const isRootAnchored = (component: SimpleComponent): boolean =>
  (component.type === "pseudo-class" && component.kind === "root") ||
  (component.type === "type" && component.name === "html");

const isDarkAnchoredSelector = (selector: SimpleComponent[]): boolean =>
  selector.length > 0 &&
  (isDarkAttribute(selector[0]) ||
    (isRootAnchored(selector[0]) &&
      selector.length > 1 &&
      isDarkAttribute(selector[1])));

/* lightningcss locates rules by line (0-based) + column (1-based, UTF-16
   code units) — both map straight onto JS string offsets via a line table. */
const offsetAt = (
  css: string,
  lineStarts: number[],
  loc: { line: number; column: number },
): number => (lineStarts[loc.line] ?? css.length) + loc.column - 1;

/* Source range of the rule starting at `start`, found by brace-matching
   with comments and quoted strings skipped, so a brace inside either
   cannot miscount. */
const ruleRange = (css: string, start: number): CssRange => {
  let depth = 0;
  let i = start;
  while (i < css.length) {
    const ch = css[i];
    if (ch === "/" && css[i + 1] === "*") {
      const close = css.indexOf("*/", i + 2);
      if (close < 0) break;
      i = close + 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      i++;
      while (i < css.length && css[i] !== ch) {
        if (css[i] === "\\") i++;
        i++;
      }
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) return { start, end: i };
    }
    i++;
  }
  throw new Error(
    `[vellume] Unbalanced braces in skin css at offset ${start}.`,
  );
};

/* Walk the authored file: record where the dark blocks are and enforce the
   look-file contract. Returns the ranges of dark blocks that are NOT nested
   inside an authored @media (such a block owns its media context already;
   docs/theming.md documents nested dark blocks as ungated). */
const analyzeLookCss = (name: string, css: string): CssRange[] => {
  const lineStarts = [0];
  for (let i = 0; i < css.length; i++) {
    if (css[i] === "\n") lineStarts.push(i + 1);
  }

  const darkRanges: CssRange[] = [];
  const mediaRanges: CssRange[] = [];

  transform({
    filename: `${name}.css`,
    code: Buffer.from(css),
    minify: false,
    visitor: {
      Rule(rule) {
        if (rule.type === "media") {
          mediaRanges.push(
            ruleRange(css, offsetAt(css, lineStarts, rule.value.loc)),
          );
          return;
        }
        if (rule.type !== "style") return;
        const { selectors, loc } = rule.value;
        if (selectors.length === 0) return;
        if (selectors.every(isDarkAnchoredSelector)) {
          darkRanges.push(ruleRange(css, offsetAt(css, lineStarts, loc)));
          return;
        }
        /* The screen gate wraps dark-anchored blocks only. A dark attribute
           anywhere else reaches print un-gated (the html attribute survives
           into print media), so it is a build error rather than a silent
           print leak. */
        for (const selector of selectors) {
          if (selector.some(isDarkAttribute)) {
            throw new Error(
              `[vellume] profiles/${name}.css:${loc.line + 1}: [data-theme="dark"] must anchor its selector — write it first ("[data-theme=\\"dark\\"] .x") or right after :root/html (":root[data-theme=\\"dark\\"]"). Mid-selector dark styling is never screen-gated and would leak dark values into print; split it into its own dark-anchored rule. See docs/theming.md.`,
            );
          }
        }
      },
    },
  });

  return darkRanges.filter(
    (dark) =>
      !mediaRanges.some(
        (media) => media.start < dark.start && dark.end < media.end,
      ),
  );
};

/* Applied last-to-first so earlier offsets stay valid while later ones are
   spliced. */
const gateDarkBlocks = (css: string, ranges: CssRange[]): string => {
  let out = css;
  for (const { start, end } of [...ranges].sort((a, b) => b.start - a.start)) {
    out = `${out.slice(0, start)}@media screen {\n${out.slice(start, end + 1)}\n}\n${out.slice(end + 1)}`;
  }
  return out;
};

/** Which bundle layer a look file is transformed into. */
export type SkinLayer =
  /** The screen layer: the active profile's file, dark blocks screen-gated. */
  | "screen"
  /** The print layer: the whole template wrapped in `@media print`. */
  | "print";

/* Parse-and-reserialize pass with no visitor: drops comments (the file
   headers' contract notes are docs, not css), normalizes whitespace, and —
   crucially — keeps var() declarations intact (lightningcss handles them in
   a plain transform; it is only RETURNING rewritten rules through the napi
   visitor that cannot round-trip them). The dark-gate analysis and text
   splicing then run on this normalized text, whose rule locs are fresh. */
const normalizeLookCss = (name: string, css: string): string =>
  transform({
    filename: `${name}.css`,
    code: Buffer.from(css),
    minify: false,
  }).code.toString();

/**
 * Transform one look file into a bundle layer. Exported for tests;
 * `buildSkinCss` is the build entry point.
 */
export function transformSkinCss(
  name: string,
  css: string,
  layer: SkinLayer = "screen",
): string {
  if (!css.trim()) return "";

  // Normalize first so comments never reach the bundle and empty files
  // (a header-only default.css) emit nothing.
  const normalized = normalizeLookCss(name, css);
  if (!normalized.trim()) return "";

  const darkRanges = analyzeLookCss(name, normalized);
  const gated = gateDarkBlocks(normalized, darkRanges);

  if (layer === "print") {
    // The whole template becomes the print presentation. Its dark blocks
    // keep their screen gate (inert when nested in print), and its own
    // @media print rules nest harmlessly. No skin constraint: printing is
    // the owner's intent, whatever the screen skin is.
    return `@media print {\n${gated}\n}\n`;
  }

  return gated;
}

/**
 * Build the stylesheet injected between global.css and the user's
 * theme.css, so precedence is always:
 * tokens.css < profile skin < print template < theme.css < custom.css.
 *
 * - The active screen skin's file, dark blocks screen-gated (the default
 *   skin's file is empty; tokens.css is the default look).
 * - `theme.print` (default `thesis`): the print template's whole file inside
 *   `@media print` — printing then follows the paper template instead of the
 *   screen skin's light half (set `theme.print: ""` to disable).
 */
export function buildSkinCss(config: SiteConfig = siteConfig): string {
  const blocks: string[] = [];

  const profile = resolveSkin(config);
  const profileCss = transformSkinCss(
    profile.name,
    readLookCss(profile.registration.file),
  );
  if (profileCss) blocks.push(profileCss);

  const printTemplate = resolvePrintTemplate(config);
  if (printTemplate) {
    const printCss = transformSkinCss(
      printTemplate.name,
      readLookCss(printTemplate.file),
      "print",
    );
    if (printCss) blocks.push(printCss);
  }

  return blocks.length > 0 ? `${blocks.join("\n")}\n` : "";
}

/**
 * Effective non-CSS branding: explicit user config (src/site/config.ts or
 * env overrides) outranks the chosen skin's meta, which outranks the
 * built-in defaults. "Explicit" is read from the raw pre-merge input, since
 * the merged config cannot tell "unset" from "set to the default value" —
 * a value the owner typed always wins, even when it equals the default.
 */
export function resolveThemeBranding(
  config: SiteConfig = siteConfig,
  explicitInput: SiteConfigInput = rawSiteConfigInput,
): {
  browserColor: SiteConfig["theme"]["browserColor"];
  shiki: { light: string; dark: string };
  og: {
    backgroundGradient: SiteConfig["og"]["backgroundGradient"];
    accent: SiteConfig["og"]["accent"];
    description: SiteConfig["og"]["description"];
    border: SiteConfig["og"]["border"];
  };
  mermaidThemeVariables: Record<string, string | number>;
} {
  const meta = resolveSkin(config).registration.meta ?? {};
  const defaults = themeDefaultConfig;

  const isExplicit = (keys: readonly string[]): boolean => {
    let node: unknown = explicitInput;
    for (const key of keys) {
      if (!isPlainObject(node)) return false;
      node = node[key];
    }
    return node !== undefined;
  };

  const pick = <T>(
    user: T,
    keys: readonly string[],
    profileValue: T | undefined,
    fallback: T,
  ): T => (isExplicit(keys) ? user : (profileValue ?? fallback));

  return {
    browserColor: {
      light: pick(
        config.theme.browserColor.light,
        ["theme", "browserColor", "light"],
        meta.browserColor?.light,
        defaults.theme.browserColor.light,
      ),
      dark: pick(
        config.theme.browserColor.dark,
        ["theme", "browserColor", "dark"],
        meta.browserColor?.dark,
        defaults.theme.browserColor.dark,
      ),
    },
    shiki: meta.shiki ?? defaultBranding.shiki,
    og: {
      backgroundGradient: pick(
        config.og.backgroundGradient,
        ["og", "backgroundGradient"],
        meta.og?.backgroundGradient,
        defaults.og.backgroundGradient,
      ),
      accent: pick(
        config.og.accent,
        ["og", "accent"],
        meta.og?.accent,
        defaults.og.accent,
      ),
      description: pick(
        config.og.description,
        ["og", "description"],
        meta.og?.description,
        defaults.og.description,
      ),
      border: {
        ...defaults.og.border,
        ...config.og.border,
        color: pick(
          config.og.border.color,
          ["og", "border", "color"],
          meta.og?.border,
          defaults.og.border.color,
        ),
      },
    },
    mermaidThemeVariables: {
      ...defaultBranding.mermaid,
      ...meta.mermaid,
    },
  };
}
