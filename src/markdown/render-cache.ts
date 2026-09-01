import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getToolchainVersions } from "./toolchain";

const CACHE_DIR = path.join(
  process.cwd(),
  "node_modules",
  ".cache",
  "vellume-render",
);

/** Path inside the render cache for auxiliary build artifacts (e.g. the
 * profile-resolved mermaid config handed to the mmdr CLI). */
export function renderCachePath(name: string): string {
  return path.join(CACHE_DIR, name);
}

export async function renderCacheKey(kind: string, input: string) {
  const { typst, mmdr } = await getToolchainVersions();

  return createHash("sha256")
    .update(`${typst}|${mmdr}|${kind}|${input}`)
    .digest("hex");
}

export async function readRenderCache(key: string): Promise<string | null> {
  try {
    return await readFile(path.join(CACHE_DIR, `${key}.svg`), "utf8");
  } catch {
    return null;
  }
}

export async function writeRenderCache(
  key: string,
  svg: string,
): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(path.join(CACHE_DIR, `${key}.svg`), svg);
  } catch {
    // The cache is a pure optimization; failures must never break a build.
  }
}
