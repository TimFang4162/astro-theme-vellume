type Primitive = string | number | boolean | null | undefined | symbol | bigint;

export type DeepPartial<T> = T extends Primitive
  ? T
  : T extends Array<infer Item>
    ? Array<DeepPartial<Item>>
    : { [Key in keyof T]?: DeepPartial<T[Key]> };

export interface SiteConfig {
  site: {
    url: string;
    title: string;
    description: string;
    lang: string;
    locale: string;
  };
  author: {
    name: string;
    introTitle: string;
    bio: string;
    tagline: string;
    copyrightName: string;
    avatar: {
      src: string;
      alt: string;
    };
  };
  links: {
    about: string;
    github: string;
    repository: string;
    email: string;
    wechatQr: string;
    rss: string;
  };
  comments: {
    enabled: boolean;
    server: string;
    site: string;
  };
  home: {
    feed: {
      title: string;
      description: string;
      browseLabel: string;
      browseHref: string;
      limit: number;
    };
  };
  theme: {
    browserColor: {
      light: string;
      dark: string;
    };
  };
}

export type SiteConfigInput = DeepPartial<SiteConfig>;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === "[object Object]";

const mergeConfigObject = <T extends Record<string, unknown>>(
  base: T,
  override: DeepPartial<T>,
): T => {
  const result = { ...base } as Record<string, unknown>;

  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) {
      continue;
    }

    const current = result[key];

    result[key] =
      isPlainObject(current) && isPlainObject(value)
        ? mergeConfigObject(current, value as DeepPartial<typeof current>)
        : value;
  }

  return result as T;
};

export const defineSiteConfig = <T extends SiteConfigInput>(config: T): T =>
  config;

export const createSiteConfig = (override: SiteConfigInput = {}): SiteConfig =>
  mergeConfigObject(themeDefaultConfig, override) as SiteConfig;

export const themeDefaultConfig: SiteConfig = {
  site: {
    url: "https://example.com",
    title: "Vellume",
    description:
      "An Astro theme for blogs, notes, and long-form writing, with mixed post and series feeds, discovery pages, and reading-focused article layouts.",
    lang: "zh-CN",
    locale: "zh_CN",
  },
  author: {
    name: "Your Name",
    introTitle: "Hi there.",
    bio: "Vellume is a writing-focused Astro theme for blogs, notes, and essays, with warm typography, structured discovery, and article pages designed for longer reading.",
    tagline: "A calm structure for writing that lasts.",
    copyrightName: "Your Name",
    avatar: {
      src: "/assets/avatar.png",
      alt: "Author avatar",
    },
  },
  links: {
    about: "/about",
    github: "https://github.com/TimFang4162",
    repository: "https://github.com/TimFang4162/astro-theme-vellume",
    email: "mailto:hello@example.com",
    wechatQr: "https://example.com/wechat-qr.png",
    rss: "/rss.xml",
  },
  comments: {
    enabled: false,
    server: "",
    site: "",
  },
  home: {
    feed: {
      title: "最新内容",
      description: "最近更新的独立文章与系列内容",
      browseLabel: "浏览全部内容",
      browseHref: "/discovery",
      limit: 12,
    },
  },
  theme: {
    browserColor: {
      light: "#ffffff",
      dark: "#09090b",
    },
  },
};
