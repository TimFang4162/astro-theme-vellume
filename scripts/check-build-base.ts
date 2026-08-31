import { promises as fs } from "node:fs";
import path from "node:path";
import { normalizeBasePath } from "../src/utils/base-path-core";

function collectAbsolutePaths(content: string): string[] {
  const matches: string[] = [];
  const pattern = /\b(?:href|src|content)=["'](\/[^"'?#]*)[^"']*["']/g;

  for (const match of content.matchAll(pattern)) {
    const value = match[1];

    if (value.startsWith("//")) {
      continue;
    }

    matches.push(value);
  }

  return matches;
}

function isAllowedAbsolutePath(value: string, basePath: string): boolean {
  if (basePath === "/") {
    return true;
  }

  return value === basePath || value.startsWith(`${basePath}/`);
}

async function walkHtmlFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walkHtmlFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(entryPath);
    }
  }

  return files;
}

async function main(): Promise<void> {
  const basePath = normalizeBasePath(process.env.SITE_BASE);

  if (basePath === "/") {
    return;
  }

  const distDir = path.join(process.cwd(), "dist");
  const htmlFiles = await walkHtmlFiles(distDir);
  const filesToCheck = [
    ...htmlFiles,
    path.join(distDir, "rss.xml"),
    path.join(distDir, "sitemap-index.xml"),
  ];
  const failures: Array<{ filePath: string; invalidPaths: string[] }> = [];

  for (const filePath of filesToCheck) {
    try {
      const content = await fs.readFile(filePath, "utf8");
      const invalidPaths = [
        ...new Set(
          collectAbsolutePaths(content).filter(
            (value) => !isAllowedAbsolutePath(value, basePath),
          ),
        ),
      ];

      if (invalidPaths.length > 0) {
        failures.push({ filePath, invalidPaths });
      }
    } catch {
      // Ignore optional build outputs that may not exist.
    }
  }

  if (failures.length === 0) {
    return;
  }

  const details = failures
    .map(
      ({ filePath, invalidPaths }) =>
        `${path.relative(process.cwd(), filePath)}\n${invalidPaths
          .map((value) => `  - ${value}`)
          .join("\n")}`,
    )
    .join("\n\n");

  throw new Error(
    `Build output contains paths outside base ${basePath}:\n\n${details}`,
  );
}

await main();
