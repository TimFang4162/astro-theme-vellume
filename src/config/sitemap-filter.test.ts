import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const projectCwd = process.cwd();
let tempDir: string;
// The filter resolves the content dir from cwd at import time, so the module
// is imported only after the fixture workspace is in place.
let createUnlistedSitemapFilter: typeof import("./sitemap-filter")["createUnlistedSitemapFilter"];

beforeAll(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), "vellume-sitemap-"));
  const blogDir = path.join(tempDir, "src/content/blog");
  await mkdir(blogDir, { recursive: true });
  await writeFile(
    path.join(blogDir, "visible.md"),
    "---\ntitle: Visible\nslug: visible-post\npublishedAt: 2026-01-01\n---\n",
  );
  await writeFile(
    path.join(blogDir, "hidden.md"),
    "---\ntitle: Hidden\nslug: hidden-post\npublishedAt: 2026-01-02\nvisibility: unlisted\n---\n",
  );
  await writeFile(
    path.join(blogDir, "draft.md"),
    "---\ntitle: Draft\nslug: draft-post\npublishedAt: 2026-01-03\nvisibility: draft\n---\n",
  );

  process.chdir(tempDir);
  vi.resetModules();
  ({ createUnlistedSitemapFilter } = await import("./sitemap-filter"));
});

afterAll(async () => {
  process.chdir(projectCwd);
  await rm(tempDir, { recursive: true, force: true });
});

describe("createUnlistedSitemapFilter", () => {
  it("drops unlisted posts and keeps everything else", async () => {
    const filter = createUnlistedSitemapFilter("/");

    expect(
      await filter({ url: "https://example.com/posts/hidden-post/" }),
    ).toBeUndefined();
    expect(
      await filter({ url: "https://example.com/posts/visible-post/" }),
    ).toEqual({ url: "https://example.com/posts/visible-post/" });
    expect(
      await filter({ url: "https://example.com/posts/draft-post/" }),
    ).toEqual({ url: "https://example.com/posts/draft-post/" });
  });

  it("strips the configured base path before matching", async () => {
    const filter = createUnlistedSitemapFilter("/blog");

    expect(
      await filter({ url: "https://example.com/blog/posts/hidden-post" }),
    ).toBeUndefined();
    expect(
      await filter({ url: "https://example.com/posts/hidden-post" }),
    ).toBeUndefined();
  });

  it("keeps entries that are not URLs", async () => {
    const filter = createUnlistedSitemapFilter("/");

    expect(await filter({ url: "not-a-url" })).toEqual({ url: "not-a-url" });
  });
});
