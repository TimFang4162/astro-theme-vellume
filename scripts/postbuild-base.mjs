import { promises as fs } from "node:fs";
import path from "node:path";

function normalizeBasePath(basePath) {
  if (!basePath || basePath === "/") {
    return "/";
  }

  const withLeadingSlash = basePath.startsWith("/")
    ? basePath
    : `/${basePath}`;

  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
}

function withBasePath(value, basePath) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return value;
  }

  if (basePath === "/" || value === basePath || value.startsWith(`${basePath}/`)) {
    return value;
  }

  return value === "/" ? `${basePath}/` : `${basePath}${value}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function patchMarkup(content, basePath) {
  const escapedBase = escapeRegExp(basePath.slice(1));
  const attributePattern = new RegExp(
    `((?:href|src|content)=["'])/(?!${escapedBase}(?:/|["']))`,
    "g",
  );

  return content.replace(attributePattern, `$1${basePath}/`);
}

function patchJsonValue(value, basePath) {
  if (Array.isArray(value)) {
    return value.map((item) => patchJsonValue(item, basePath));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        patchJsonValue(entry, basePath),
      ]),
    );
  }

  return typeof value === "string" ? withBasePath(value, basePath) : value;
}

async function patchFile(filePath, transform) {
  const original = await fs.readFile(filePath, "utf8");
  const updated = transform(original);

  if (updated !== original) {
    await fs.writeFile(filePath, updated, "utf8");
  }
}

async function main() {
  const basePath = normalizeBasePath(process.env.SITE_BASE);

  if (basePath === "/") {
    return;
  }

  const distDir = path.join(process.cwd(), "dist");

  await Promise.all(
    [
      path.join(distDir, "index.html"),
      path.join(distDir, "404.html"),
      path.join(distDir, "about", "index.html"),
      path.join(distDir, "discovery", "index.html"),
      path.join(distDir, "posts", "index.html"),
      path.join(distDir, "series", "index.html"),
      path.join(distDir, "tags", "index.html"),
    ].map(async (filePath) => {
      try {
        await patchFile(filePath, (content) => patchMarkup(content, basePath));
      } catch {
        // Ignore files that do not exist in the current build.
      }
    }),
  );

  async function patchDirectoryHtml(directory) {
    let entries = [];

    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }

    await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
          await patchDirectoryHtml(entryPath);
          return;
        }

        if (entry.isFile() && entry.name.endsWith(".html")) {
          await patchFile(entryPath, (content) => patchMarkup(content, basePath));
        }
      }),
    );
  }

  await Promise.all([
    patchDirectoryHtml(path.join(distDir, "posts")),
    patchDirectoryHtml(path.join(distDir, "series")),
    patchDirectoryHtml(path.join(distDir, "tags")),
  ]);

  for (const fileName of ["manifest.webmanifest", "yandex-browser-manifest.json"]) {
    const filePath = path.join(distDir, fileName);

    try {
      await patchFile(filePath, (content) =>
        JSON.stringify(
          patchJsonValue(JSON.parse(content), basePath),
          null,
          2,
        ),
      );
    } catch {
      // Ignore files that do not exist in the current build.
    }
  }

  for (const fileName of ["browserconfig.xml"]) {
    const filePath = path.join(distDir, fileName);

    try {
      await patchFile(filePath, (content) => patchMarkup(content, basePath));
    } catch {
      // Ignore files that do not exist in the current build.
    }
  }
}

await main();
