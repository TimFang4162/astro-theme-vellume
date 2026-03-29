import { type CollectionEntry, getCollection } from "astro:content";

export type BlogPost = CollectionEntry<"blog">;
export type SeriesEntry = CollectionEntry<"series">;

let blogPostsPromise: Promise<BlogPost[]> | undefined;
let seriesEntriesPromise: Promise<SeriesEntry[]> | undefined;
let publicBlogPostsPromise: Promise<BlogPost[]> | undefined;
let accessibleBlogPostsPromise: Promise<BlogPost[]> | undefined;
let seriesTitleMapPromise: Promise<Map<string, string>> | undefined;

export function sortBlogPosts(posts: BlogPost[]) {
  return [...posts].sort(
    (a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf(),
  );
}

export function isPublicPost(post: BlogPost) {
  return post.data.visibility === "public";
}

export function isAccessiblePost(post: BlogPost) {
  return post.data.visibility !== "draft";
}

export function getAllBlogPosts() {
  blogPostsPromise ??= getCollection("blog");
  return blogPostsPromise;
}

export function getSeriesEntries() {
  seriesEntriesPromise ??= getCollection("series");
  return seriesEntriesPromise;
}

export async function getPublicBlogPosts() {
  publicBlogPostsPromise ??= getAllBlogPosts().then((posts) =>
    sortBlogPosts(posts.filter(isPublicPost)),
  );
  return publicBlogPostsPromise;
}

export async function getAccessibleBlogPosts() {
  accessibleBlogPostsPromise ??= getAllBlogPosts().then((posts) =>
    sortBlogPosts(posts.filter(isAccessiblePost)),
  );
  return accessibleBlogPostsPromise;
}

export async function getSeriesTitleMap() {
  seriesTitleMapPromise ??= getSeriesEntries().then(
    (seriesEntries) =>
      new Map(seriesEntries.map((series) => [series.id, series.data.title])),
  );
  return seriesTitleMapPromise;
}

export function sortSeriesPosts(posts: BlogPost[]) {
  return [...posts].sort(
    (a, b) => a.data.publishedAt.valueOf() - b.data.publishedAt.valueOf(),
  );
}

export function getTagCounts(posts: BlogPost[]) {
  return posts.reduce((acc, post) => {
    post.data.tags.forEach((tag) => {
      acc.set(tag, (acc.get(tag) || 0) + 1);
    });
    return acc;
  }, new Map<string, number>());
}

export function sortTagCounts(tagCounts: Map<string, number>) {
  return Array.from(tagCounts.entries()).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"),
  );
}

export function groupPostsByMonth(posts: BlogPost[]) {
  return posts.reduce(
    (groups, post) => {
      const date = new Date(post.data.publishedAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      groups[key] ??= [];
      groups[key].push(post);
      return groups;
    },
    {} as Record<string, BlogPost[]>,
  );
}

export function getSeriesMap(posts: BlogPost[]) {
  const seriesMap = posts.reduce((acc, post) => {
    if (!post.data.series) {
      return acc;
    }

    const currentPosts = acc.get(post.data.series.id) ?? [];
    currentPosts.push(post);
    acc.set(post.data.series.id, currentPosts);
    return acc;
  }, new Map<string, BlogPost[]>());

  return new Map(
    Array.from(seriesMap.entries()).map(([series, seriesPosts]) => [
      series,
      sortSeriesPosts(seriesPosts),
    ]),
  );
}

export function getSeriesPosts(posts: BlogPost[], series: string) {
  return getSeriesMap(posts).get(series) ?? [];
}

export function getAdjacentPosts(posts: BlogPost[], currentId: string) {
  const currentIndex = posts.findIndex((post) => post.id === currentId);

  return {
    prev: currentIndex > 0 ? posts[currentIndex - 1] : undefined,
    next:
      currentIndex >= 0 && currentIndex < posts.length - 1
        ? posts[currentIndex + 1]
        : undefined,
  };
}

export function getSeriesMeta(seriesEntries: SeriesEntry[], posts: BlogPost[]) {
  return seriesEntries
    .map((seriesEntry) => {
      const seriesPosts = getSeriesPosts(posts, seriesEntry.id);

      return {
        entry: seriesEntry,
        posts: seriesPosts,
        count: seriesPosts.length,
        latestPublishedAt:
          seriesPosts[seriesPosts.length - 1]?.data.publishedAt ??
          seriesPosts[0]?.data.publishedAt,
      };
    })
    .filter((seriesItem) => seriesItem.count > 0)
    .sort(
      (a, b) =>
        (b.latestPublishedAt?.valueOf() ?? 0) -
        (a.latestPublishedAt?.valueOf() ?? 0),
    );
}
