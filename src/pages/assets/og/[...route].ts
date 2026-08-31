import { OGImageRoute } from "astro-og-canvas";
import { siteConfig, siteHost } from "../../../config/site";
import { getAccessibleBlogPosts } from "../../../lib/blog";

// Accessible (public + unlisted) posts all embed an OG image on their page, so
// each of them needs one; drafts are never built and don't.
const accessiblePosts = await getAccessibleBlogPosts();

const pages: Record<string, { title: string; description?: string }> = {
  index: {
    title: siteConfig.site.title,
    description: siteConfig.site.description,
  },
  ...Object.fromEntries(
    accessiblePosts.map(({ id, data }) => [
      id,
      {
        title: data.title,
        description:
          data.description || `${siteConfig.site.title} / ${siteHost}`,
      },
    ]),
  ),
};

export const { getStaticPaths, GET } = await OGImageRoute({
  param: "route",
  pages,
  getImageOptions: (_path, page) => ({
    title: page.title,
    description: page.description,
    dir: "ltr",
    bgGradient: siteConfig.og.backgroundGradient,
    border: {
      color: siteConfig.og.border.color,
      width: siteConfig.og.border.width,
      side: "inline-start",
    },
    logo: {
      path: "./public/assets/favicon.png",
      size: [200],
    },
    padding: 40,
    font: {
      title: {
        color: siteConfig.og.accent,
        size: 60,
        weight: "Bold",
        lineHeight: 1.2,
        families: [siteConfig.og.fonts.title.family],
      },
      description: {
        color: siteConfig.og.description,
        size: 36,
        weight: "Normal",
        lineHeight: 1.4,
        families: [siteConfig.og.fonts.description.family],
      },
    },
    fonts: [
      siteConfig.og.fonts.title.file,
      siteConfig.og.fonts.description.file,
    ],
  }),
});
