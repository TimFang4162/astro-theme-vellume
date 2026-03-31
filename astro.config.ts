import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import favicons from "astro-favicons";
import icon from "astro-icon";
import pagefind from "astro-pagefind";
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import { siteConfig, siteUrl } from "./src/config/site";
import { MARKDOWN_PIPELINE_VERSION } from "./src/markdown/pipeline-version";
import { rehypeHierarchicalHeadingIds } from "./src/markdown/rehype-heading-ids";
import { rehypeRenderTypstMath } from "./src/markdown/rehype-render-typst-math";
import { remarkReadingTime } from "./src/markdown/remark-reading-time";
import { remarkRenderDiagrams } from "./src/markdown/remark-render-diagrams";
import { createShikiTransformers } from "./src/markdown/shiki-transformers";

// https://astro.build/config
export default defineConfig({
  site: siteUrl.href,

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
      [remarkRenderDiagrams, { version: MARKDOWN_PIPELINE_VERSION }],
      remarkBreaks,
    ],
    rehypePlugins: [
      [rehypeRenderTypstMath, { version: MARKDOWN_PIPELINE_VERSION }],
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
              assetFileNames: "assets/static/[name]1-[hash][extname]",
            },
          },
        },
      },
    },
  },
  build: {
    assets: "assets",
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: "viewport",
  },
  image: {
    layout: "constrained",
  },
  integrations: [
    sitemap(),
    icon({}),
    pagefind(),
    favicons({
      input: "public/assets/favicon.png",
      name: siteConfig.site.title,
      short_name: siteConfig.site.title,
      background: siteConfig.theme.browserColor.light,
      appleStatusBarStyle: "black-translucent",
      themes: [
        siteConfig.theme.browserColor.light,
        siteConfig.theme.browserColor.dark,
      ],
      icons: {
        favicons: true,
        android: true,
        appleIcon: true,
        appleStartup: false,
        windows: false,
        yandex: true,
      },
    }),
  ],
});
