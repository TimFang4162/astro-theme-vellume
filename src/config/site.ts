import { siteOverride } from "../site/config";
import { type SiteConfig, themeDefaultConfig } from "./theme-default";

export const siteConfig: SiteConfig = {
  ...themeDefaultConfig,
  ...siteOverride,
  site: {
    ...themeDefaultConfig.site,
    ...siteOverride.site,
  },
  author: {
    ...themeDefaultConfig.author,
    ...siteOverride.author,
    avatar: {
      ...themeDefaultConfig.author.avatar,
      ...siteOverride.author?.avatar,
    },
  },
  links: {
    ...themeDefaultConfig.links,
    ...siteOverride.links,
  },
  comments: {
    ...themeDefaultConfig.comments,
    ...siteOverride.comments,
  },
  home: {
    ...themeDefaultConfig.home,
    ...siteOverride.home,
    feed: {
      ...themeDefaultConfig.home.feed,
      ...siteOverride.home?.feed,
    },
  },
  theme: {
    ...themeDefaultConfig.theme,
    ...siteOverride.theme,
    browserColor: {
      ...themeDefaultConfig.theme.browserColor,
      ...siteOverride.theme?.browserColor,
    },
  },
};

export const siteUrl = new URL(siteConfig.site.url);
export const siteHost = siteUrl.host;
