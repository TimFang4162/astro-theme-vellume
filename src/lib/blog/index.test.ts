import { describe, expect, it, vi } from "vitest";
import {
  type BlogPost,
  getAdjacentPosts,
  getSeriesMap,
  getSeriesMeta,
  getSeriesPosts,
  getTagCounts,
  groupPostsByMonth,
  isAccessiblePost,
  isPublicPost,
  type SeriesEntry,
  sortBlogPosts,
  sortTagCounts,
} from "./index";

vi.mock("astro:content", () => ({ getCollection: vi.fn() }));

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

describe("sortBlogPosts", () => {
  it("sorts newest first without mutating the input", () => {
    const a = makePost("a", { publishedAt: new Date("2026-01-01") });
    const b = makePost("b", { publishedAt: new Date("2026-03-01") });
    const c = makePost("c", { publishedAt: new Date("2026-02-01") });
    const input = [a, b, c];

    const sorted = sortBlogPosts(input);

    expect(sorted.map((post) => post.id)).toEqual(["b", "c", "a"]);
    expect(input.map((post) => post.id)).toEqual(["a", "b", "c"]);
  });
});

describe("visibility predicates", () => {
  it("treats only public posts as public", () => {
    expect(isPublicPost(makePost("p", { visibility: "public" }))).toBe(true);
    expect(isPublicPost(makePost("u", { visibility: "unlisted" }))).toBe(false);
    expect(isPublicPost(makePost("d", { visibility: "draft" }))).toBe(false);
  });

  it("treats drafts as inaccessible but unlisted as accessible", () => {
    expect(isAccessiblePost(makePost("p", { visibility: "public" }))).toBe(
      true,
    );
    expect(isAccessiblePost(makePost("u", { visibility: "unlisted" }))).toBe(
      true,
    );
    expect(isAccessiblePost(makePost("d", { visibility: "draft" }))).toBe(
      false,
    );
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

describe("groupPostsByMonth", () => {
  it("groups by YYYY-MM with zero-padded months", () => {
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

  it("sorts series posts chronologically ascending", () => {
    const seriesMap = getSeriesMap(posts);

    expect(seriesMap.get("alpha")?.map((post) => post.id)).toEqual([
      "s1-old",
      "s1-new",
    ]);
    expect(seriesMap.get("beta")?.map((post) => post.id)).toEqual(["s2"]);
    expect(seriesMap.has("loose")).toBe(false);
  });

  it("returns an empty list for unknown series", () => {
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
