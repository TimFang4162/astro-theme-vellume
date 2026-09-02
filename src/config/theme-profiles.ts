import { readFileSync } from "node:fs";
import path from "node:path";
import { transform } from "lightningcss";
import type { ProfileBranding, ProfileRegistration } from "./profile-types";
import { siteConfig } from "./site";
import type { SiteConfig } from "./theme-default";
import { themeDefaultConfig } from "./theme-default";

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

export type { ProfileBranding, ProfileRegistration } from "./profile-types";

const profilesDir = path.resolve(process.cwd(), "src/site/profiles");

/**
 * Baseline branding for the default skin. Its css file stays empty
 * (tokens.css is the default look); meta carries the non-CSS consumers whose
 * defaults have no other single home.
 */
const defaultBranding: Required<Pick<ProfileBranding, "shiki" | "mermaid">> = {
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
export const skins: Record<string, ProfileRegistration> = {
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
};

/** Labels for the visitor-facing skin switcher (order = menu order). */
export const skinOptions: Array<{ name: string; label: string }> =
  Object.entries(skins).map(([name, registration]) => ({
    name,
    label: registration.label ?? name,
  }));

export interface ResolvedSkin {
  name: string;
  registration: ProfileRegistration;
}

export function resolveSkin(): ResolvedSkin {
  const name = siteConfig.theme.profile || "default";
  if (Object.hasOwn(skins, name)) {
    return { name, registration: skins[name] };
  }
  console.warn(
    `[vellume] Unknown skin "${name}"; falling back to "default". Known skins: ${Object.keys(skins).join(", ")}.`,
  );
  return { name: "default", registration: skins.default };
}

function readProfileCss(registration: ProfileRegistration): string {
  return readFileSync(path.join(profilesDir, registration.file), "utf8");
}

/* ── Skin css scoping ────────────────────────────────────────────────────
 *
 * Emitted css is consumed verbatim by the browser, so the transform is a
 * real CSS parse (lightningcss), not text rewriting. Per skin:
 *
 * - Every selector gains a zero-specificity `:where([data-skin="<name>"])`
 *   constraint: appended for root-anchored selectors (`:root`, dark), so it
 *   constrains the same element; prefixed as a descendant for structural
 *   selectors. Zero specificity keeps the cascade order-based — a skin can
 *   never outrank tokens.css (earlier) or theme.css/custom.css (later).
 * - Dark blocks (`[data-theme="dark"]` first component) are wrapped in
 *   `@media screen`, so real printing and the browser print dialog's
 *   preview both render the light values.
 */

const isDarkAttribute = (component: {
  type: string;
  name?: string;
  operation?: { operator?: string; value?: string } | null;
}): boolean =>
  component.type === "attribute" &&
  component.name === "data-theme" &&
  component.operation?.operator === "equal" &&
  component.operation?.value === "dark";

function scopeSkinCss(name: string, css: string): string {
  if (!css.trim()) return "";

  /* Source locs of rules this invocation already wrapped in `@media screen`;
     file-scoped, since loc offsets are relative to the skin file. */
  const wrappedRuleLocs = new Set<string>();

  const whereSkin = () => ({
    type: "pseudo-class" as const,
    kind: "where" as const,
    selectors: [
      [
        {
          type: "attribute" as const,
          name: "data-skin",
          operation: { operator: "equal" as const, value: name },
        },
      ],
    ],
  });

  const { code } = transform({
    filename: `${name}.css`,
    code: Buffer.from(css),
    minify: false,
    visitor: {
      /* Rule-level (not whole-`StyleSheet`) visitor: lightningcss's napi
         bindings cannot round-trip a `var()` declaration back through a
         returned rule (failed to deserialize "Specifier"), and a StyleSheet
         visitor re-crosses every rule in the file. A rule-level visitor only
         crosses what it returns, so var()-bearing structural rules survive
         untouched via a `void` return. */
      Rule(rule) {
        if (rule.type !== "style") return;
        /* Returning a replacement re-visits it (re-deserialized, so object
           identity is lost); the rule's source loc is the only stable key,
           and it marks the wrap as done. */
        const loc = rule.value.loc;
        const locKey = `${loc.source_index}:${loc.line}:${loc.column}`;
        if (wrappedRuleLocs.has(locKey)) return;
        const { selectors } = rule.value;
        const isDarkBlock =
          selectors.length > 0 &&
          selectors.every(
            (selector) => selector.length > 0 && isDarkAttribute(selector[0]),
          );
        if (!isDarkBlock) return;
        wrappedRuleLocs.add(locKey);
        return {
          type: "media" as const,
          value: {
            loc,
            query: { mediaQueries: [{ mediaType: "screen" }] },
            rules: [rule],
          },
        };
      },
      Selector(selector) {
        if (selector.length === 0) return selector;
        const first = selector[0];
        if (
          isDarkAttribute(first) ||
          (first.type === "pseudo-class" && first.kind === "root")
        ) {
          return [first, whereSkin(), ...selector.slice(1)];
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
}

/**
 * Build the skin stylesheet injected between global.css and the user's
 * theme.css, so precedence is always: tokens.css < skins < theme.css.
 * Every registered skin is emitted (scoped); empty files emit nothing.
 */
export function buildSkinCss(): string {
  const blocks = Object.entries(skins)
    .map(([name, registration]) =>
      scopeSkinCss(name, readProfileCss(registration)),
    )
    .filter((css) => css.length > 0);
  return blocks.length > 0 ? `${blocks.join("\n")}\n` : "";
}

const valuesEqual = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

/**
 * Effective non-CSS branding: explicit user config outranks the owner's
 * default skin, which outranks the built-in defaults. A user value is
 * detected as explicit by differing from the theme default (the merge layer
 * cannot tell "unset" from "set to the default value", and both resolve
 * identically).
 */
export function resolveThemeBranding(): {
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
  const meta = resolveSkin().registration.meta ?? {};
  const defaults = themeDefaultConfig;
  const pick = <T>(user: T, profileValue: T | undefined, fallback: T): T =>
    !valuesEqual(user, fallback) ? user : (profileValue ?? fallback);

  return {
    browserColor: {
      light: pick(
        siteConfig.theme.browserColor.light,
        meta.browserColor?.light,
        defaults.theme.browserColor.light,
      ),
      dark: pick(
        siteConfig.theme.browserColor.dark,
        meta.browserColor?.dark,
        defaults.theme.browserColor.dark,
      ),
    },
    shiki: meta.shiki ?? defaultBranding.shiki,
    og: {
      backgroundGradient: pick(
        siteConfig.og.backgroundGradient,
        meta.og?.backgroundGradient,
        defaults.og.backgroundGradient,
      ),
      accent: pick(siteConfig.og.accent, meta.og?.accent, defaults.og.accent),
      description: pick(
        siteConfig.og.description,
        meta.og?.description,
        defaults.og.description,
      ),
      border: {
        ...defaults.og.border,
        ...siteConfig.og.border,
        color: pick(
          siteConfig.og.border.color,
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
