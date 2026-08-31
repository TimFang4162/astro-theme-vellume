import { describe, expect, it, vi } from "vitest";
import {
  type BlogPost,
  getAdjacentPosts,
  getMonthKey,
  getSeriesMeta,
  getSeriesPosts,
  getTagCounts,
  groupPostsByMonth,
  isAccessiblePost,
  type SeriesEntry,
  sortTagCounts,
} from "./index";

const getCollectionMock = vi.fn();

vi.mock("astro:content", () => ({
  getCollection: (...args: unknown[]) => getCollectionMock(...args),
}));

type BlogData = BlogPost["data"];

const seriesRef = (id: string) => ({ id, collection: "series" }) as const;

function makePost(id: string, data: Partial<BlogData> = {}): BlogPost {
  return {
    id,
    body: "",
    collection: "blog",
    data: {
      title: id,
      slug: id,
      publishedAt: new Date("2026-01-01T00:00:00Z"),
      tags: [],
      visibility: "public",
      ...data,
    },
  } as unknown as BlogPost;
}

function makeSeries(id: string): SeriesEntry {
  return {
    id,
    body: "",
    collection: "series",
    data: { title: id, slug: id },
  } as unknown as SeriesEntry;
}

/**
 * The post getters memoize their result at module scope, so each scenario
 * loads a fresh module instance against a fresh getCollection mock.
 */
async function loadBlogModule() {
  vi.resetModules();
  getCollectionMock.mockClear();
  return await import("./index");
}

describe("post lists", () => {
  it("getPublicBlogPosts sorts newest first and keeps only public posts", async () => {
    const { getPublicBlogPosts } = await loadBlogModule();
    getCollectionMock.mockResolvedValue([
      makePost("a", { publishedAt: new Date("2026-01-01") }),
      makePost("u", {
        publishedAt: new Date("2026-03-01"),
        visibility: "unlisted",
      }),
      makePost("b", { publishedAt: new Date("2026-02-01") }),
      makePost("d", {
        publishedAt: new Date("2026-04-01"),
        visibility: "draft",
      }),
    ]);

    const posts = await getPublicBlogPosts();

    expect(posts.map((post) => post.id)).toEqual(["b", "a"]);
  });

  it("getAccessibleBlogPosts keeps unlisted posts but drops drafts", async () => {
    const { getAccessibleBlogPosts } = await loadBlogModule();
    getCollectionMock.mockResolvedValue([
      makePost("p", { publishedAt: new Date("2026-01-01") }),
      makePost("u", {
        publishedAt: new Date("2026-03-01"),
        visibility: "unlisted",
      }),
      makePost("d", {
        publishedAt: new Date("2026-04-01"),
        visibility: "draft",
      }),
    ]);

    const posts = await getAccessibleBlogPosts();

    expect(posts.map((post) => post.id)).toEqual(["u", "p"]);
    expect(posts.every((post) => isAccessiblePost(post))).toBe(true);
  });

  it("memoizes repeated lookups", async () => {
    const { getPublicBlogPosts } = await loadBlogModule();
    getCollectionMock.mockResolvedValue([makePost("a")]);

    const first = await getPublicBlogPosts();
    const second = await getPublicBlogPosts();

    expect(second).toBe(first);
    expect(getCollectionMock).toHaveBeenCalledTimes(1);
  });
});

describe("tag counts", () => {
  it("counts every tag across posts", () => {
    const counts = getTagCounts([
      makePost("a", { tags: ["astro", "css"] }),
      makePost("b", { tags: ["astro"] }),
      makePost("c", { tags: [] }),
    ]);

    expect(Object.fromEntries(counts)).toEqual({ astro: 2, css: 1 });
  });

  it("sorts by count desc, then zh-CN pinyin order on ties", () => {
    expect(
      sortTagCounts(
        new Map([
          ["类型系统", 1],
          ["前端", 1],
          ["astro", 3],
        ]),
      ),
    ).toEqual([
      ["astro", 3],
      ["类型系统", 1],
      ["前端", 1],
    ]);
  });
});

describe("month grouping", () => {
  it("getMonthKey uses local time with zero-padded months", () => {
    expect(getMonthKey(new Date(2026, 0, 9))).toBe("2026-01");
    expect(getMonthKey(new Date(2025, 11, 31))).toBe("2025-12");
  });

  it("groups by YYYY-MM in list order", () => {
    const groups = groupPostsByMonth([
      makePost("a", { publishedAt: new Date("2026-01-09") }),
      makePost("b", { publishedAt: new Date("2026-01-20") }),
      makePost("c", { publishedAt: new Date("2025-12-31") }),
    ]);

    expect(Object.keys(groups)).toEqual(["2026-01", "2025-12"]);
    expect(groups["2026-01"].map((post) => post.id)).toEqual(["a", "b"]);
  });
});

describe("series helpers", () => {
  const posts = [
    makePost("s1-old", {
      series: seriesRef("alpha"),
      publishedAt: new Date("2026-01-01"),
    }),
    makePost("s1-new", {
      series: seriesRef("alpha"),
      publishedAt: new Date("2026-03-01"),
    }),
    makePost("s2", {
      series: seriesRef("beta"),
      publishedAt: new Date("2026-02-01"),
    }),
    makePost("loose"),
  ];

  it("getSeriesPosts groups by series and sorts chronologically", () => {
    expect(getSeriesPosts(posts, "alpha").map((post) => post.id)).toEqual([
      "s1-old",
      "s1-new",
    ]);
    expect(getSeriesPosts(posts, "beta").map((post) => post.id)).toEqual([
      "s2",
    ]);
    expect(getSeriesPosts(posts, "missing")).toEqual([]);
  });

  it("builds series metadata sorted by latest publish date", () => {
    const meta = getSeriesMeta(
      [makeSeries("alpha"), makeSeries("beta"), makeSeries("empty")],
      posts,
    );

    expect(meta.map((item) => item.entry.id)).toEqual(["alpha", "beta"]);
    expect(meta[0].count).toBe(2);
    expect(meta[0].latestPublishedAt).toEqual(new Date("2026-03-01"));
    expect(meta[1].latestPublishedAt).toEqual(new Date("2026-02-01"));
  });
});

describe("getAdjacentPosts", () => {
  it("returns neighbors based on list order", () => {
    const posts = [makePost("a"), makePost("b"), makePost("c")];

    expect(getAdjacentPosts(posts, "b")).toEqual({
      prev: posts[0],
      next: posts[2],
    });
    expect(getAdjacentPosts(posts, "a").prev).toBeUndefined();
    expect(getAdjacentPosts(posts, "c").next).toBeUndefined();
    expect(getAdjacentPosts(posts, "missing")).toEqual({
      prev: undefined,
      next: undefined,
    });
  });
});
