export const siteConfig = {
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
} as const;

export const siteUrl = new URL(siteConfig.site.url);
export const siteHost = siteUrl.host;
