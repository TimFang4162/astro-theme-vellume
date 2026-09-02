import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "lightningcss";
import { rawSiteConfigInput, siteConfig } from "./site";
import type { SkinBranding, SkinRegistration } from "./skin-types";
import {
  isPlainObject,
  type SiteConfig,
  type SiteConfigInput,
  themeDefaultConfig,
} from "./theme-default";

/**
 * Skins: one css file per skin under `src/site/profiles/`, plus a small
 * typed registration entry here.
 *
 * Boundary contract (see docs/theming.md):
 * - Every registered skin ships to every visitor and is runtime-switchable
 *   via the `data-skin` root attribute; `theme.profile` only picks the
 *   server-side default.
 * - The build scopes each skin's selectors with zero-specificity
 *   `:where([data-skin="<name>"])` and wraps dark blocks in `@media screen`
 *   (paper always renders the light values), so the cascade is purely
 *   order-based: tokens.css < skins < theme.css < custom.css.
 * - Skins carry values and their own structural rules; nothing here encodes
 *   per-visitor behaviour.
 */

export type { SkinBranding, SkinRegistration } from "./skin-types";

/* Resolved from this module's own URL, not the process cwd, so Node-side
   consumers (astro.config.ts, the favicon script) resolve it the same way
   no matter where they are invoked from. */
export const skinsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../site/profiles",
);

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

/**
 * The skin registry: one css file per skin. Adding a skin means dropping a
 * file into `src/site/profiles/` and registering it here — it then shows up
 * in the visitor skin switcher automatically.
 */
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
    label: "Material",
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

  /* Paper typesetting on plain white: serif body with justified indented
     paragraphs, heiti section titles, three-line tables, chromeless code
     and diagram panels, and a compact print rhythm. Screen shows the
     paper; printing inherits it. The dark block mirrors light so the
     paper look survives the dark toggle. */
  thesis: {
    file: "thesis.css",
    label: "论文",
    meta: {
      browserColor: { light: "#ffffff", dark: "#ffffff" },
    },
  },
} satisfies Record<string, SkinRegistration>;

export type SkinName = keyof typeof skins;

/* Explicit annotation: entries of the satisfies-typed literal carry the
   per-entry literal types, which the label fallback below cannot read. */
const skinEntries: [string, SkinRegistration][] = Object.entries(skins);

/** Labels for the visitor-facing skin switcher (order = menu order). */
export const skinOptions: Array<{ name: string; label: string }> =
  skinEntries.map(([name, registration]) => ({
    name,
    label: registration.label ?? name,
  }));

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

/* Slot names are validated once per name; resolveThemeBranding resolves on
   every page render, so the warning must not spam the build log. */
const warnedSlotNames = new Set<string>();

/**
 * Resolve an optional per-mode slot (`theme.dark` / `theme.print`) to a
 * skin. Unset or unknown names return undefined, which disables the slot.
 */
export function resolveSkinSlot(
  slot: "dark" | "print",
  config: SiteConfig = siteConfig,
): ResolvedSkin | undefined {
  const name = config.theme[slot];
  if (!name) return undefined;
  const found = skinEntries.find(([key]) => key === name);
  if (found) {
    return { name: found[0], registration: found[1] };
  }
  const warningKey = `${slot}:${name}`;
  if (!warnedSlotNames.has(warningKey)) {
    warnedSlotNames.add(warningKey);
    console.warn(
      `[vellume] Unknown skin "${name}" for theme.${slot}; ignoring the slot. Known skins: ${Object.keys(skins).join(", ")}.`,
    );
  }
  return undefined;
}

function readSkinCss(registration: SkinRegistration): string {
  return readFileSync(path.join(skinsDir, registration.file), "utf8");
}

/* ── Skin css transform ──────────────────────────────────────────────────
 *
 * Emitted css is consumed verbatim by the browser, so every rewrite is a
 * real CSS parse (lightningcss), not text rewriting. Per skin:
 *
 * - Dark blocks (selectors anchored on `[data-theme="dark"]`, optionally
 *   through `:root`/`html`) are wrapped in `@media screen` TEXTUALLY, using
 *   source ranges located by the parser. Text wrapping keeps the block
 *   byte-identical: comments survive, and var()-bearing declarations never
 *   round-trip through the napi bindings (which cannot deserialize them
 *   back into Rust). Dark blocks nested inside an authored @media keep that
 *   block's own media context and are not gated.
 * - Every selector gains a zero-specificity `:where([data-skin="<name>"])`
 *   constraint: appended for root-anchored selectors (`:root`, `html`,
 *   dark anchors), so it constrains the same element; prefixed as a
 *   descendant for everything else. Zero specificity keeps the cascade
 *   order-based — a skin can never outrank tokens.css (earlier) or
 *   theme.css/custom.css (later).
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

/* Root-anchored: the attribute lives on the same element the selector
   starts from, so the :where constraint is appended instead of prefixed. */
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

/* Phase 1 — walk the authored file: record where the dark blocks are and
   enforce the skin css contract. Returns the ranges of dark blocks that are
   NOT nested inside an authored @media (such a block owns its media context
   already; docs/theming.md documents nested dark blocks as ungated). */
const analyzeSkinCss = (name: string, css: string): CssRange[] => {
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
              `[vellume] skins/${name}.css:${loc.line + 1}: [data-theme="dark"] must anchor its selector — write it first ("[data-theme=\\"dark\\"] .x") or right after :root/html (":root[data-theme=\\"dark\\"]"). Mid-selector dark styling is never screen-gated and would leak dark values into print; split it into its own dark-anchored rule. See docs/theming.md.`,
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

/* Phase 2 — textual gate. Applied last-to-first so earlier offsets stay
   valid while later ones are spliced. */
const gateDarkBlocks = (css: string, ranges: CssRange[]): string => {
  let out = css;
  for (const { start, end } of [...ranges].sort((a, b) => b.start - a.start)) {
    out = `${out.slice(0, start)}@media screen {\n${out.slice(start, end + 1)}\n}\n${out.slice(end + 1)}`;
  }
  return out;
};

/* Pull just the dark blocks out of the file (for the dark-slot layer,
   which must not carry the light tokens or structural rules). */
const extractDarkBlocks = (css: string, ranges: CssRange[]): string =>
  ranges.map(({ start, end }) => css.slice(start, end + 1)).join("\n");

/* Phase 3 — zero-specificity scoping (selectors never carry var(), so
   returning rewritten selectors through the napi bindings is safe).
   `attribute` selects the root attribute the skin is scoped to. */
/* Zero-specificity scoping (selectors never carry var(), so returning
   rewritten selectors through the napi bindings is safe). `attribute` is the
   root attribute the skin is scoped to. `darkYieldsToSlot` marks the skin's
   OWN dark blocks as conditional on the dark slot being absent: without it
   a `data-skin` that equals the owner's `profile` would apply its dark half
   even when `theme.dark` names a different skin. The screen layer sets it;
   the dark-slot layer (scoped to data-skin-dark) does not, since there the
   attribute is the slot itself. */
const scopeSkinSelectors = (
  name: string,
  css: string,
  attribute: string = "data-skin",
  darkYieldsToSlot: boolean = false,
): string => {
  const whereSkin = () => ({
    type: "pseudo-class" as const,
    kind: "where" as const,
    selectors: [
      [
        {
          type: "attribute" as const,
          name: attribute,
          operation: { operator: "equal" as const, value: name },
        },
      ],
    ],
  });

  /* `[data-skin=x]:where(:not([data-skin-dark]))` — active only while no
     dark slot overrides the mode. */
  const whereNoDarkSlot = () => ({
    type: "pseudo-class" as const,
    kind: "where" as const,
    selectors: [
      [
        {
          type: "pseudo-class" as const,
          kind: "not" as const,
          selectors: [
            [
              {
                type: "attribute" as const,
                name: "data-skin-dark",
              },
            ],
          ],
        },
      ],
    ],
  });

  const { code } = transform({
    filename: `${name}.css`,
    code: Buffer.from(css),
    minify: false,
    visitor: {
      Selector(selector) {
        if (selector.length === 0) return selector;
        const first = selector[0];
        if (isDarkAttribute(first) || isRootAnchored(first)) {
          const darkBlock = isDarkAnchoredSelector(selector);
          return [
            first,
            whereSkin(),
            ...(darkBlock && darkYieldsToSlot ? [whereNoDarkSlot()] : []),
            ...selector.slice(1),
          ];
        }
        return [
          whereSkin(),
          { type: "combinator" as const, value: "descendant" },
          ...selector,
        ];
      },
    },
  });

  return code.toString();
};

/** Which bundle layer a skin's css is emitted into. */
export type SkinLayer =
  /** The regular skin layer: everything, scoped to `data-skin`. */
  | "screen"
  /** The dark-mode slot layer: only the dark half, scoped to
      `data-skin-dark` so it can apply while the screen skin stays
      `profile`'s. */
  | "dark-screen"
  /** The print slot layer: the light presentation wrapped in
      `@media print`, unconstrained — printing follows the owner's slot,
      not the visitor's skin. */
  | "print";

/**
 * Transform one skin file into a bundle layer.
 * Exported for tests; `buildSkinCss` is the build entry point.
 */
export function transformSkinCss(
  name: string,
  css: string,
  layer: SkinLayer = "screen",
): string {
  if (!css.trim()) return "";

  if (layer === "print") {
    // The whole file becomes the print presentation. Dark blocks keep
    // their screen gate, which nesting inside print renders inert; the
    // author's own @media print blocks nest harmlessly. No data-skin
    // constraint: the print slot applies whatever the visitor picked.
    const gated = gateDarkBlocks(css, analyzeSkinCss(name, css));
    return `@media print {\n${gated}\n}\n`;
  }

  if (layer === "dark-screen") {
    const only = extractDarkBlocks(css, analyzeSkinCss(name, css));
    if (!only.trim()) return "";
    const gated = gateDarkBlocks(only, analyzeSkinCss(name, only));
    // data-skin-dark IS the slot, so no :not([data-skin-dark]) gating.
    return scopeSkinSelectors(name, gated, "data-skin-dark");
  }

  const darkRanges = analyzeSkinCss(name, css);
  // The skin's own dark half yields to the dark slot when it is present.
  return scopeSkinSelectors(
    name,
    gateDarkBlocks(css, darkRanges),
    "data-skin",
    true,
  );
}

/**
 * Build the stylesheet injected between global.css and the user's
 * theme.css, so precedence is always:
 * tokens.css < skins < dark slot < print slot < theme.css.
 *
 * - Every registered skin is emitted into the screen layer (scoped);
 *   empty files emit nothing.
 * - `theme.dark` adds the slot skin's dark half scoped to `data-skin-dark`,
 *   after the skins layer so it wins for dark mode while the visitor has
 *   not picked a skin. Same skin as `profile` emits nothing (identical).
 * - `theme.print` adds the slot skin's light presentation wrapped in
 *   `@media print`, unconstrained: printing is publisher intent and
 *   outranks whatever skin the visitor is on.
 */
export function buildSkinCss(): string {
  const blocks = Object.entries(skins)
    .map(([name, registration]) =>
      transformSkinCss(name, readSkinCss(registration)),
    )
    .filter((css) => css.length > 0);

  const profile = resolveSkin();
  const dark = resolveSkinSlot("dark");
  if (dark && dark.name !== profile.name) {
    blocks.push(
      transformSkinCss(
        dark.name,
        readSkinCss(dark.registration),
        "dark-screen",
      ),
    );
  }

  const print = resolveSkinSlot("print");
  if (print) {
    blocks.push(
      transformSkinCss(print.name, readSkinCss(print.registration), "print"),
    );
  }

  return blocks.length > 0 ? `${blocks.join("\n")}\n` : "";
}

/**
 * Effective non-CSS branding: explicit user config (src/site/config.ts or
 * env overrides) outranks the owner's default skin, which outranks the
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
  /* Light-mode branding follows `profile`; the dark half follows the
     `theme.dark` slot when configured, so browser chrome and code
     highlighting stay coherent with what dark-mode visitors actually
     see. og/mermaid are single-look build artifacts and follow `profile`. */
  const light = resolveSkin(config);
  const darkSkin = resolveSkinSlot("dark", config) ?? light;
  const lightMeta = light.registration.meta ?? {};
  const darkMeta = darkSkin.registration.meta ?? {};
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
        lightMeta.browserColor?.light,
        defaults.theme.browserColor.light,
      ),
      dark: pick(
        config.theme.browserColor.dark,
        ["theme", "browserColor", "dark"],
        darkMeta.browserColor?.dark,
        defaults.theme.browserColor.dark,
      ),
    },
    shiki: {
      light: lightMeta.shiki?.light ?? defaultBranding.shiki.light,
      dark: darkMeta.shiki?.dark ?? defaultBranding.shiki.dark,
    },
    og: {
      backgroundGradient: pick(
        config.og.backgroundGradient,
        ["og", "backgroundGradient"],
        lightMeta.og?.backgroundGradient,
        defaults.og.backgroundGradient,
      ),
      accent: pick(
        config.og.accent,
        ["og", "accent"],
        lightMeta.og?.accent,
        defaults.og.accent,
      ),
      description: pick(
        config.og.description,
        ["og", "description"],
        lightMeta.og?.description,
        defaults.og.description,
      ),
      border: {
        ...defaults.og.border,
        ...config.og.border,
        color: pick(
          config.og.border.color,
          ["og", "border", "color"],
          lightMeta.og?.border,
          defaults.og.border.color,
        ),
      },
    },
    mermaidThemeVariables: {
      ...defaultBranding.mermaid,
      ...lightMeta.mermaid,
    },
  };
}
