import { render } from "astro:content";
import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { siteConfig, siteUrl } from "../config/site";
import { getPublicBlogPosts } from "../lib/blog";
import { withBasePath } from "../utils/paths";

/**
 * RSS readers have no base URL to resolve root-relative paths against, so
 * rewrite the `/...` URLs emitted by the markdown pipeline (asset routes,
 * base-path links) to absolute ones.
 */
function absolutizeUrls(html: string, site: URL | string) {
  return html.replace(
    /\b(src|href)="(\/[^"]*)"/g,
    (_match, attribute: string, path: string) =>
      `${attribute}="${new URL(path, site).href}"`,
  );
}

export async function GET(context: APIContext) {
  const posts = await getPublicBlogPosts();
  const site = context.site ?? siteUrl;
  const container = await AstroContainer.create();

  const items = await Promise.all(
    posts.map(async (post) => {
      const { Content } = await render(post);
      const html = await container.renderToString(Content);

      return {
        title: post.data.title,
        pubDate: post.data.publishedAt,
        description: post.data.description || post.data.title,
        link: withBasePath(`/posts/${post.id}/`),
        categories: post.data.tags,
        content: absolutizeUrls(html, site),
      };
    }),
  );

  return rss({
    title: siteConfig.site.title,
    description: siteConfig.site.description,
    site,
    items,
  });
}
