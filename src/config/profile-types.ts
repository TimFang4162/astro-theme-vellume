import type { SiteConfig } from "./theme-default";

/**
 * Skin types, kept dependency-free so both the config defaults and the
 * profile resolver can import them without a module cycle.
 *
 * A skin is ONE css file under `src/site/profiles/` plus a small typed
 * registration entry in `src/config/theme-profiles.ts`:
 * - the css file carries the tokens (light `:root` block, dark
 *   `[data-theme="dark"]` block) and may carry structural rules;
 * - the registration carries what css cannot: the menu label and branding
 *   for the non-CSS color consumers.
 *
 * Boundary contract (see docs/theming.md): every skin ships to every visitor
 * and switches at runtime via the `data-skin` root attribute. The build
 * scopes each file's selectors with zero-specificity `:where([data-skin])`
 * and wraps dark blocks in `@media screen` (paper always renders the light
 * values), so the cascade stays purely order-based:
 * tokens.css < skins < theme.css < custom.css.
 */

/** Non-CSS color consumers that follow the owner's default skin. Each field
 * is a default that explicit user config (src/site/config.ts) outranks. */
export interface ProfileBranding {
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

/** One skin = one registration: a css file plus its typed metadata. */
export interface ProfileRegistration {
  /** css file path relative to `src/site/profiles/`. */
  file: string;
  /** Menu label; falls back to the skin name. */
  label?: string;
  /** Branding defaults for the non-CSS color consumers. */
  meta?: ProfileBranding;
}
