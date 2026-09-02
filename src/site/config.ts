import { defineSiteConfig } from "../config/theme-default";
import { siteMetadata } from "./metadata";

export const siteOverride = defineSiteConfig({
  site: {
    url: siteMetadata.url,
    title: siteMetadata.title,
    description: siteMetadata.description,
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
  // Pick the site's screen skin by name — one css file per skin lives in
  // src/site/profiles/ (default / material). It sets the whole light and
  // dark look; there is no visitor-side switching.
  // theme: {
  //   profile: "material",
  // },
  // Optional: always print with a paper template (src/site/profiles/,
  // `thesis`), regardless of the screen skin. Unset = print follows the
  // profile skin's light half.
  // theme: {
  //   profile: "material",
  //   print: "thesis",
  // },
});
