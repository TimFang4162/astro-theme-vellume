export const siteConfig = {
  site: {
    url: "https://example.com",
    title: "Vellume",
    description:
      "An editorial Astro theme for personal writing, technical notes, and long-form posts.",
    lang: "zh-CN",
    locale: "zh_CN",
  },
  author: {
    name: "Your Name",
    introTitle: "Hi there.",
    bio: "Vellume is designed for personal writing, technical notes, and long-form posts, with warm typography and a calm editorial layout.",
    tagline: "A quiet place for thoughtful publishing.",
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
} as const;

export const siteUrl = new URL(siteConfig.site.url);
export const siteHost = siteUrl.host;
