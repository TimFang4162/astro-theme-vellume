import { siteOverride } from "../site/config";
import type { SiteConfigInput } from "./theme-default";
import { mergeSiteConfig } from "./theme-default";

function loadEnvOverrides(): SiteConfigInput {
  const raw = import.meta.env.SITE_CONFIG_OVERRIDES;
  if (!raw || typeof raw !== "string") return {};
  try {
    return JSON.parse(raw) as SiteConfigInput;
  } catch {
    return {};
  }
}

export const siteConfig = mergeSiteConfig({
  ...siteOverride,
  ...loadEnvOverrides(),
});

export const siteUrl = new URL(siteConfig.site.url);
export const siteHost = siteUrl.host;
