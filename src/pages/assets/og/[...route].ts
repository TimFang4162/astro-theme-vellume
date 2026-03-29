import { OGImageRoute } from "astro-og-canvas";
import { siteConfig, siteHost } from "../../../config/site";
import { getPublicBlogPosts } from "../../../lib/blog";

const publicPosts = await getPublicBlogPosts();

const pages: Record<string, { title: string; description?: string }> = {
  index: {
    title: siteConfig.site.title,
    description: siteConfig.site.description,
  },
  ...Object.fromEntries(
    publicPosts.map(({ id, data }) => [
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
    bgGradient: [
      [24, 24, 27],
      [9, 9, 11],
    ],
    border: {
      color: [254, 180, 169],
      width: 8,
      side: "inline-start",
    },
    logo: {
      path: "./public/assets/favicon.png",
      size: [200],
    },
    padding: 40,
    font: {
      title: {
        color: [254, 180, 169],
        size: 60,
        weight: "Bold",
        lineHeight: 1.2,
        families: ["Noto Serif SC"],
      },
      description: {
        color: [139, 148, 158],
        size: 36,
        weight: "Normal",
        lineHeight: 1.4,
        families: ["Noto Sans SC"],
      },
    },
    fonts: [
      "./src/assets/fonts/NotoSerifSC-Bold.ttf",
      "./src/assets/fonts/NotoSansSC-Regular.ttf",
    ],
  }),
});
