import type { SiteConfig } from "./theme-default";

/**
 * Theme profile types, kept dependency-free so both the config defaults and
 * the profile resolver can import them without a module cycle.
 *
 * A profile is ONE css file under `src/site/profiles/` plus a small typed
 * registration entry in `src/config/theme-profiles.ts`:
 * - the css file carries every token (screen profiles: light + dark blocks;
 *   print profiles: one flat `:root` token block),
 * - the registration carries what css cannot: the menu label, root state
 *   attributes, and branding for the non-CSS color consumers.
 *
 * Boundary contract (see docs/theming.md): the profile system is
 * semantic-free — it injects tokens and relays state attributes; structural
 * variants are theme-owned CSS rules keyed on those attributes.
 */

/** CSS custom property overrides, e.g. `{ "--primary": "#188038" }`. */
export type TokenOverrides = Record<string, string>;

/** Root data-attributes relayed verbatim to `<html>`, e.g. `"data-print-links": "footnote"`. */
export type ProfileStates = Record<string, string>;

/**
 * Non-CSS color consumers that follow the active profile. Each field is a
 * default that explicit user config (src/site/config.ts) still outranks.
 */
export interface ProfileBranding {
  browserColor?: { light: string; dark: string };
  shiki?: { light: string; dark: string };
  og?: {
    accent?: SiteConfig["og"]["accent"];
    backgroundGradient?: SiteConfig["og"]["backgroundGradient"];
    description?: SiteConfig["og"]["description"];
    border?: SiteConfig["og"]["border"]["color"];
  };
  mermaid?: Record<string, string>;
}

/** One theme = one registration: a css file plus its typed metadata. */
export interface ProfileRegistration {
  /** css file path relative to `src/site/profiles/`. */
  file: string;
  /** Menu label; falls back to the profile name. */
  label?: string;
  /** Root data-attributes relayed to `<html>` while this profile is active. */
  states?: ProfileStates;
  /** Branding defaults for the non-CSS color consumers. */
  meta?: ProfileBranding;
}
