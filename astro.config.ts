import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import icon from "astro-icon";
import pagefind from "astro-pagefind";
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import type { Plugin } from "vite";
import { siteUrl } from "./src/config/site";
import { createUnlistedSitemapFilter } from "./src/config/sitemap-filter";
import {
  buildSkinCss,
  resolveThemeBranding,
  skinsDir,
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

const virtualSkinsModule = "\0virtual:vellume-skins.css";
// Generates every registered skin's stylesheet (:where-scoped, dark blocks
// screen-gated) so it can be imported between global.css and theme.css —
// bundle order then guarantees the precedence chain
// tokens.css < skins < theme.css < custom.css.
const skinsPlugin: Plugin = {
  name: "vellume-skins",
  resolveId(id) {
    if (id === "virtual:vellume-skins.css") return virtualSkinsModule;
    return null;
  },
  load(id) {
    if (id !== virtualSkinsModule) return null;
    return buildSkinCss();
  },
  configureServer(server) {
    // Skin css is read from disk inside the virtual module, so it is not in
    // the module graph; without this, edits to src/site/profiles/*.css
    // would need a dev-server restart to show up.
    const refresh = (file: string) => {
      if (!file.startsWith(skinsDir)) return;
      // The client and SSR graphs are unrelated classes — invalidate each.
      const clientMod = server.moduleGraph.getModuleById(virtualSkinsModule);
      if (clientMod) server.moduleGraph.invalidateModule(clientMod);
      const ssrGraph = server.environments?.ssr?.moduleGraph;
      const ssrMod = ssrGraph?.getModuleById(virtualSkinsModule);
      if (ssrMod && ssrGraph) ssrGraph.invalidateModule(ssrMod);
      server.ws.send({ type: "full-reload" });
    };
    server.watcher.on("add", refresh);
    server.watcher.on("change", refresh);
    server.watcher.on("unlink", refresh);
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
    plugins: [skinsPlugin, tailwindcss()],
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
