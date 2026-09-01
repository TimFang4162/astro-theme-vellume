export const siteMetadata = {
  url: "https://example.com",
  title: "Vellume",
  description:
    "An Astro theme for blogs, notes, and long-form writing, with mixed post and series feeds, discovery pages, and reading-focused article layouts.",
};

export const faviconMetadata = {
  // background/themeColor follow the active theme profile automatically
  // (resolved in scripts/generate-favicons.ts); run `bun run
  // generate:favicons` after switching profiles.
  appleStatusBarStyle: "black-translucent",
  display: "standalone",
  orientation: "any",
  startUrl: "./?homescreen=1",
};
