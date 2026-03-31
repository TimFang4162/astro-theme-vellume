import { siteOverride } from "../site/config";
import { createSiteConfig } from "./theme-default";

export const siteConfig = createSiteConfig(siteOverride);

export const siteUrl = new URL(siteConfig.site.url);
export const siteHost = siteUrl.host;
