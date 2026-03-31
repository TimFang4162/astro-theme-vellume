import { defineSiteConfig } from "../config/theme-default";

export const siteOverride = defineSiteConfig({
  site: {
    url: "https://example.com",
    title: "Vellume",
    description:
      "An Astro theme for blogs, notes, and long-form writing, with mixed post and series feeds, discovery pages, and reading-focused article layouts.",
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
    github: "https://github.com/TimFang4162",
    repository: "https://github.com/TimFang4162/astro-theme-vellume",
    email: "mailto:hello@example.com",
    wechatQr: "https://example.com/wechat-qr.png",
  },
  // Uncomment to enable comments.
  // comments: {
  //   enabled: true,
  //   server: "https://comments.example.com",
  //   site: "your-site-name",
  // },
  // Uncomment to customize homepage feed copy and size.
  // home: {
  //   feed: {
  //     title: "最新内容",
  //     description: "最近更新的独立文章与系列内容",
  //     browseLabel: "浏览全部内容",
  //     browseHref: "/discovery",
  //     limit: 12,
  //   },
  // },
  // Uncomment to sync browser chrome colors with your visual theme.
  // theme: {
  //   browserColor: {
  //     light: "#ffffff",
  //     dark: "#09090b",
  //   },
  // },
});
