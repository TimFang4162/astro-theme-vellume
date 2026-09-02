import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import icon from "astro-icon";
import pagefind from "astro-pagefind";
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import { siteUrl } from "./src/config/site";
import { createUnlistedSitemapFilter } from "./src/config/sitemap-filter";
import {
  buildSkinCss,
  resolveThemeBranding,
} from "./src/config/theme-profiles";
import { rehypeHierarchicalHeadingIds } from "./src/markdown/rehype-heading-ids";
import { rehypeImageCaptions } from "./src/markdown/rehype-image-captions";
import { rehypeRenderTypstMath } from "./src/markdown/rehype-render-typst-math";
import { remarkReadingTime } from "./src/markdown/remark-reading-time";
import { remarkRenderDiagrams } from "./src/markdown/remark-render-diagrams";
import { createShikiTransformers } from "./src/markdown/shiki-transformers";
import { normalizeBasePath } from "./src/utils/base-path-core";

const siteBase = normalizeBasePath(process.env.SITE_BASE || "/");
const branding = resolveThemeBranding();

const virtualThemeProfileModule = "\0virtual:vellume-theme-profile.css";
// Generates every registered skin's stylesheet (:where-scoped, dark blocks
// screen-gated) so it can be imported between global.css and theme.css —
// bundle order then guarantees the precedence chain
// tokens.css < skins < theme.css < custom.css.
const themeProfilePlugin = {
  name: "vellume-theme-profile",
  resolveId(id: string) {
    if (id === "virtual:vellume-theme-profile.css")
      return virtualThemeProfileModule;
    return null;
  },
  load(id: string) {
    if (id !== virtualThemeProfileModule) return null;
    return buildSkinCss();
  },
};

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
      // Profile-resolved theme names. Shiki's type only enumerates known
      // presets, but arbitrary bundled theme names work at runtime.
      themes: branding.shiki as Record<
        string,
        "github-light" | "github-dark-default"
      >,
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
    plugins: [themeProfilePlugin, tailwindcss()],
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
    icon(),
    pagefind(),
  ],
});
