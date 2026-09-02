import { siteOverride } from "../site/config";
import {
  mergeSiteConfig,
  mergeSiteConfigInputs,
  type SiteConfigInput,
} from "./theme-default";

function loadEnvOverrides(): SiteConfigInput {
  // import.meta.env covers Vite-processed modules (SSR, pages); process.env
  // covers plain Node consumers — astro.config.ts and the favicon script —
  // where import.meta.env is undefined. Astro loads .env into process.env
  // before evaluating the config file, so both contexts see the overrides.
  const raw =
    import.meta.env?.SITE_CONFIG_OVERRIDES ??
    (typeof process === "undefined"
      ? undefined
      : process.env?.SITE_CONFIG_OVERRIDES);
  if (!raw || typeof raw !== "string") return {};
  try {
    return JSON.parse(raw) as SiteConfigInput;
  } catch (error) {
    console.warn(
      "[vellume] SITE_CONFIG_OVERRIDES is not valid JSON; ignoring env overrides.",
      error,
    );
    return {};
  }
}

/** What the owner wrote (site/config.ts + env overrides), defaults not
 * applied. Skins need the pre-merge view to honor explicit config that
 * happens to equal a default value. */
export const rawSiteConfigInput = mergeSiteConfigInputs(
  siteOverride,
  loadEnvOverrides(),
);

export const siteConfig = mergeSiteConfig(rawSiteConfigInput);

export const siteUrl = new URL(siteConfig.site.url);
export const siteHost = siteUrl.host;
