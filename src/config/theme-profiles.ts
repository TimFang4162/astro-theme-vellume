import { readFileSync } from "node:fs";
import path from "node:path";
import type {
  ProfileBranding,
  ProfileRegistration,
  ProfileStates,
} from "./profile-types";
import { siteConfig } from "./site";
import type { SiteConfig } from "./theme-default";
import { themeDefaultConfig } from "./theme-default";

/**
 * Theme profiles: one css file per theme under `src/site/profiles/`, plus a
 * small typed registration entry here.
 *
 * Boundary contract (see docs/theming.md):
 * - The profile system is semantic-free. It loads the active profile's css,
 *   injects it as CSS custom properties, and relays root state attributes to
 *   <html>.
 * - Profiles carry values only; structural variants live in the theme
 *   stylesheets keyed on those state attributes.
 */

export type {
  ProfileBranding,
  ProfileRegistration,
  ProfileStates,
  TokenOverrides,
} from "./profile-types";

const profilesDir = path.resolve(process.cwd(), "src/site/profiles");

/**
 * Baseline branding for the default profile. Its css file stays empty
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
    fontSize: "13",
  },
};

/**
 * The screen-profile registry: one css file per theme. Adding a theme means
 * dropping a file into `src/site/profiles/` and registering it here.
 */
export const themeProfiles: Record<string, ProfileRegistration> = {
  /* The shipped look: zinc greys, single blue accent (tokens.css itself). */
  default: {
    file: "default.css",
    meta: defaultBranding,
  },

  /* Layered sheet layout: grey canvas, near-white content sheet, green
     accent, rounder corners. */
  material: {
    file: "material.css",
    label: "Material",
    meta: {
      browserColor: { light: "#f0f1ec", dark: "#121411" },
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

  /* Warm paper neutrals with a terracotta accent; long-form reading look. */
  sepia: {
    file: "sepia.css",
    label: "Sepia",
    meta: {
      browserColor: { light: "#f6f1e7", dark: "#191512" },
      og: {
        accent: [209, 154, 107],
        backgroundGradient: [
          [26, 21, 17],
          [15, 12, 10],
        ],
        description: [148, 138, 124],
        border: [209, 154, 107],
      },
      mermaid: {
        secondaryColor: "#F7F1E5",
        tertiaryColor: "#F0E6D6",
        clusterBkg: "#F9F4EA",
      },
    },
  },
};

/**
 * The print-profile registry (css files under `profiles/print/`).
 * Structural differences between them are implemented in print.css keyed on
 * the `data-print` root attribute, so the owner default and the visitor
 * print menu go through one path.
 */
export const printProfiles: Record<string, ProfileRegistration> = {
  default: { file: "default.css", label: "标准" },
  paper: { file: "print/paper.css", label: "纸张" },
  compact: { file: "print/compact.css", label: "紧凑" },
};

/** Labels for the visitor-facing print menu (order = menu order). */
export const printProfileOptions: Array<{ name: string; label: string }> =
  Object.entries(printProfiles).map(([name, registration]) => ({
    name,
    label: registration.label ?? name,
  }));

export interface ResolvedThemeProfiles {
  screen: { name: string; registration: ProfileRegistration };
  print: { name: string; registration: ProfileRegistration };
  /** State attributes to stamp on every page's `<html>`. */
  rootStates: ProfileStates;
  /** `data-print` value for the active print profile; unset for "default". */
  printAttribute: string | undefined;
}

const isRegisteredScreenProfile = (
  name: string,
): name is keyof typeof themeProfiles => Object.hasOwn(themeProfiles, name);

const isRegisteredPrintProfile = (
  name: string,
): name is keyof typeof printProfiles => Object.hasOwn(printProfiles, name);

export function resolveThemeProfiles(): ResolvedThemeProfiles {
  const screenName = siteConfig.theme.profile || "default";
  const printName = siteConfig.theme.print || "default";
  const screenKnown = isRegisteredScreenProfile(screenName);
  const printKnown = isRegisteredPrintProfile(printName);

  if (!screenKnown) {
    console.warn(
      `[vellume] Unknown theme profile "${screenName}"; falling back to "default". Known profiles: ${Object.keys(themeProfiles).join(", ")}.`,
    );
  }
  if (!printKnown) {
    console.warn(
      `[vellume] Unknown print profile "${printName}"; falling back to "default". Known profiles: ${Object.keys(printProfiles).join(", ")}.`,
    );
  }

  return {
    screen: {
      name: screenKnown ? screenName : "default",
      registration: themeProfiles[screenKnown ? screenName : "default"],
    },
    print: {
      name: printName,
      registration: printProfiles[printKnown ? printName : "default"],
    },
    rootStates:
      themeProfiles[screenKnown ? screenName : "default"].states ?? {},
    printAttribute:
      printKnown && printName !== "default" ? printName : undefined,
  };
}

function readProfileCss(registration: ProfileRegistration): string {
  return readFileSync(path.join(profilesDir, registration.file), "utf8");
}

/** Print profile files hold ONE flat `:root { --token: value; }` block; the
 * system re-scopes copies for the visitor menu's `[data-print]` switching. */
function parsePrintTokens(css: string): string[] {
  return css.match(/--[\w-]+\s*:\s*[^;{}]+;/g) ?? [];
}

/**
 * Build the profile stylesheet injected between global.css and the user's
 * theme.css, so precedence is always: tokens.css < profile < theme.css.
 *
 * The active screen profile's css is injected verbatim. Under `@media print`,
 * every registered print profile's tokens are re-scoped to
 * `[data-print="<name>"]` — the `data-print` root attribute (owner default or
 * visitor menu) picks the active set.
 */
export function buildThemeProfileCss(): string {
  const { screen } = resolveThemeProfiles();
  const blocks: string[] = [];

  const screenCss = readProfileCss(screen.registration).trim();
  if (screenCss) {
    blocks.push(screenCss);
  }

  const printBlocks: string[] = [];
  for (const [name, registration] of Object.entries(printProfiles)) {
    if (name === "default") continue;
    const tokens = parsePrintTokens(readProfileCss(registration));
    if (tokens.length > 0) {
      printBlocks.push(`[data-print="${name}"] {\n  ${tokens.join("\n  ")}\n}`);
    }
  }
  if (printBlocks.length > 0) {
    blocks.push(`@media print {\n${printBlocks.join("\n")}\n}`);
  }

  return `${blocks.join("\n")}\n`;
}

const valuesEqual = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

/**
 * Effective non-CSS branding: explicit user config outranks the active
 * profile, which outranks the built-in defaults. A user value is detected as
 * explicit by differing from the theme default (the merge layer cannot tell
 * "unset" from "set to the default value", and both resolve identically).
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
  mermaidThemeVariables: Record<string, string>;
} {
  const meta = resolveThemeProfiles().screen.registration.meta ?? {};
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
