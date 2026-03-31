import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { siteConfig, siteUrl } from "../config/site";
import { getPublicBlogPosts } from "../lib/blog";
import { withBasePath } from "../utils/paths";

export async function GET(context: APIContext) {
  const posts = await getPublicBlogPosts();
  return rss({
    title: siteConfig.site.title,
    description: siteConfig.site.description,
    site: context.site ?? siteUrl,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.publishedAt,
      description: post.data.description || post.data.title,
      link: withBasePath(`/posts/${post.id}/`),
      categories: post.data.tags,
    })),
  });
}
