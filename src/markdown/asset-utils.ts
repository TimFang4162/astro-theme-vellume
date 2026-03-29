import { getCollection } from "astro:content";
import { isAccessiblePost } from "../lib/blog";

export async function getContentEntries() {
  const [aboutEntries, blogEntries, seriesEntries] = await Promise.all([
    getCollection("about"),
    getCollection("blog"),
    getCollection("series"),
  ]);

  return [
    ...aboutEntries,
    ...blogEntries.filter(isAccessiblePost),
    ...seriesEntries,
  ] as const;
}
