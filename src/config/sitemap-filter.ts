import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";

const CONTENT_DIR = path.resolve(process.cwd(), "src/content/blog");
const MARKDOWN_EXTENSION_PATTERN = /\.mdx?$/;
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

function parseFrontmatter(frontmatter: string): Record<string, unknown> {
  try {
    const data: unknown = parse(frontmatter);

    return typeof data === "object" && data !== null && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/**
 * Mirrors Astro's glob loader id rule: frontmatter `slug` wins, otherwise the
 * path with the extension stripped and a trailing `/index` collapsed.
 */
function toEntryId(relativePath: string, data: Record<string, unknown>) {
  const slug = typeof data.slug === "string" ? data.slug.trim() : "";

  if (slug) {
    return slug;
  }

  return relativePath
    .replace(MARKDOWN_EXTENSION_PATTERN, "")
    .replace(/\/index$/, "")
    .replace(/^index$/, "");
}

async function collectMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => !entry.name.startsWith("."))
      .map(async (entry) => {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          return collectMarkdownFiles(fullPath);
        }

        return MARKDOWN_EXTENSION_PATTERN.test(entry.name) ? [fullPath] : [];
      }),
  );

  return files.flat();
}

let unlistedPathsPromise: Promise<Set<string>> | undefined;

async function loadUnlistedPostPaths(): Promise<Set<string>> {
  const paths = new Set<string>();
  let files: string[];

  try {
    files = await collectMarkdownFiles(CONTENT_DIR);
  } catch {
    return paths;
  }

  for (const file of files) {
    try {
      const content = await readFile(file, "utf8");
      const frontmatter = FRONTMATTER_PATTERN.exec(content)?.[1];

      if (!frontmatter) {
        continue;
      }

      const data = parseFrontmatter(frontmatter);

      if (data.visibility === "unlisted") {
        const relativePath = path.relative(CONTENT_DIR, file);
        paths.add(`posts/${toEntryId(relativePath, data)}`);
      }
    } catch {
      // Unreadable files fall back to staying in the sitemap.
    }
  }

  return paths;
}

function getUnlistedPostPaths() {
  unlistedPathsPromise ??= loadUnlistedPostPaths();
  return unlistedPathsPromise;
}

/**
 * Drops `unlisted` posts from the sitemap: they are reachable by direct link
 * but should not be advertised to crawlers.
 *
 * Wired through the sitemap integration's `serialize` hook, which — unlike
 * `filter` — supports async and dropping entries by returning undefined.
 */
export function createUnlistedSitemapFilter(basePath: string) {
  return async (item: { url: string }) => {
    const unlistedPaths = await getUnlistedPostPaths();

    if (unlistedPaths.size === 0) {
      return item;
    }

    try {
      const { pathname } = new URL(item.url);
      const decoded = decodeURIComponent(pathname);
      const withoutBase =
        basePath === "/"
          ? decoded
          : decoded.startsWith(`${basePath}/`)
            ? decoded.slice(basePath.length)
            : decoded;
      const normalized = withoutBase.replace(/\/+$/, "").replace(/^\//, "");

      return unlistedPaths.has(normalized) ? undefined : item;
    } catch {
      return item;
    }
  };
}
