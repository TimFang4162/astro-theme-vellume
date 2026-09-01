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
    attribution: string;
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
    /** Named profile from the `themeProfiles` registry (one css file each
        under `src/site/profiles/`). */
    profile: string;
    /** Named print profile (see `printProfiles` in the same module). */
    print: string;
    browserColor: {
      light: string;
      dark: string;
    };
  };
  og: {
    /** Two RGB stops for the astro-og-canvas background gradient. */
    backgroundGradient: [[number, number, number], [number, number, number]];
    /** Brand accent; mirrors the dark-theme `--primary` token. */
    accent: [number, number, number];
    /** Description text; mirrors the dark-theme `--muted-foreground` token. */
    description: [number, number, number];
    border: {
      color: [number, number, number];
      width: number;
    };
    fonts: {
      title: { file: string; family: string };
      description: { file: string; family: string };
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

const createSiteConfig = (override: SiteConfigInput = {}): SiteConfig =>
  mergeConfigObject(themeDefaultConfig, override) as SiteConfig;

export const mergeSiteConfig = (...overrides: SiteConfigInput[]): SiteConfig =>
  overrides.reduce<SiteConfig>(
    (config, override) => mergeConfigObject(config, override) as SiteConfig,
    createSiteConfig(),
  );

export const themeDefaultConfig: SiteConfig = {
  site: {
    url: "https://example.com",
    title: "Vellume",
    description:
      "An Astro theme for blogs, notes, and long-form writing, with mixed post and series feeds, discovery pages, and reading-focused article layouts.",
    lang: "zh-CN",
    locale: "zh_CN",
    attribution:
      'Powered by <a href="https://astro.build" target="_blank" class="text-muted-foreground transition-colors hover:text-primary">Astro</a> & Theme <a href="https://github.com/TimFang4162/astro-theme-vellume" target="_blank" class="text-muted-foreground transition-colors hover:text-primary">Vellume</a>',
  },
  author: {
    name: "Your Name",
    introTitle: "Hi there.",
    bio: "Vellume is a writing-focused Astro theme for blogs, notes, and essays, with a calm modern interface, structured discovery, and article pages designed for longer reading.",
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
    profile: "default",
    print: "default",
    browserColor: {
      light: "#ffffff",
      dark: "#0e1116",
    },
  },
  og: {
    backgroundGradient: [
      [20, 24, 32],
      [12, 15, 20],
    ],
    accent: [76, 150, 235],
    description: [139, 148, 158],
    border: {
      color: [76, 150, 235],
      width: 8,
    },
    fonts: {
      title: {
        file: "./src/assets/fonts/NotoSerifSC-Bold.ttf",
        family: "Noto Serif SC",
      },
      description: {
        file: "./src/assets/fonts/NotoSansSC-Regular.ttf",
        family: "Noto Sans SC",
      },
    },
  },
};
