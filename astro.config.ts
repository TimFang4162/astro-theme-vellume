import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import icon from "astro-icon";
import pagefind from "astro-pagefind";
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import { siteUrl } from "./src/config/site";
import { createUnlistedSitemapFilter } from "./src/config/sitemap-filter";
import { rehypeHierarchicalHeadingIds } from "./src/markdown/rehype-heading-ids";
import { rehypeImageCaptions } from "./src/markdown/rehype-image-captions";
import { rehypeRenderTypstMath } from "./src/markdown/rehype-render-typst-math";
import { remarkReadingTime } from "./src/markdown/remark-reading-time";
import { remarkRenderDiagrams } from "./src/markdown/remark-render-diagrams";
import { createShikiTransformers } from "./src/markdown/shiki-transformers";
import { normalizeBasePath } from "./src/utils/base-path-core.mjs";

const siteBase = normalizeBasePath(process.env.SITE_BASE || "/");

// https://astro.build/config
export default defineConfig({
  site: siteUrl.href,
  base: siteBase,

  markdown: {
    syntaxHighlight: {
      type: "shiki",
      excludeLangs: ["typst", "mermaid"],
    },
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark-default",
      },
      transformers: createShikiTransformers(),
    },
    remarkPlugins: [
      remarkMath,
      remarkReadingTime,
      [remarkRenderDiagrams, { basePath: siteBase }],
      remarkBreaks,
    ],
    rehypePlugins: [
      rehypeImageCaptions,
      [rehypeRenderTypstMath, { basePath: siteBase }],
      rehypeHierarchicalHeadingIds,
    ],
  },

  vite: {
    plugins: [tailwindcss()],
    environments: {
      client: {
        build: {
          rollupOptions: {
            output: {
              // path names relative to `outDir`
              entryFileNames: "assets/js/[hash].js",
              chunkFileNames: "assets/js/[hash].js",
              assetFileNames: "assets/static/[name]-[hash][extname]",
            },
          },
        },
      },
    },
  },
  build: {
    assets: "assets",
  },
  image: {
    layout: "constrained",
  },
  integrations: [
    sitemap({ serialize: createUnlistedSitemapFilter(siteBase) }),
    icon({}),
    pagefind(),
  ],
});
