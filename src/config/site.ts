export const siteConfig = {
  site: {
    url: "https://example.com",
    title: "Vellume",
    description:
      "A warm editorial Astro theme for personal writing and long-form notes.",
    lang: "zh-CN",
    locale: "zh_CN",
  },
  author: {
    name: "John Smith",
    introTitle: "Hi, I'm John Smith.",
    bio: "Vellume is an Astro theme for journals, technical notes, and long-form writing with a warm editorial feel.",
    tagline: "Thoughtful writing, quietly presented.",
    copyrightName: "John Smith",
    avatar: {
      src: "/assets/avatar.png",
      alt: "John Smith Avatar",
    },
  },
  links: {
    about: "/about",
    github: "https://github.com/TimFang4162",
    repository: "https://github.com/TimFang4162/astro-theme-vellume",
    email: "mailto:mail.example.com",
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
