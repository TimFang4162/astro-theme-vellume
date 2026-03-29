import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getAccessibleBlogPosts } from "../../../../lib/blog";

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".7z": "application/x-7z-compressed",
  ".rar": "application/vnd.rar",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
};

export async function getStaticPaths() {
  const posts = await getAccessibleBlogPosts();
  const paths: Array<{ params: { slug: string; asset: string } }> = [];

  for (const post of posts) {
    if (!post.filePath) {
      continue;
    }

    const postDir = path.dirname(path.resolve(post.filePath));
    const attachmentsDir = path.join(postDir, "attachments");

    let attachmentEntries: string[] = [];
    try {
      attachmentEntries = await collectFiles(attachmentsDir);
    } catch {
      attachmentEntries = [];
    }

    attachmentEntries.forEach((filePath) => {
      const relativeAsset = path.relative(attachmentsDir, filePath);
      paths.push({
        params: {
          slug: post.id,
          asset: relativeAsset.split(path.sep).join("/"),
        },
      });
    });
  }

  return paths;
}

export async function GET({
  params,
}: {
  params: { slug: string; asset: string };
}) {
  const posts = await getAccessibleBlogPosts();
  const post = posts.find((entry) => entry.id === params.slug);

  if (!post?.filePath) {
    return new Response("Not found", { status: 404 });
  }

  const attachmentsRoot = path.resolve(
    path.dirname(path.resolve(post.filePath)),
    "attachments",
  );
  const absolutePath = path.resolve(
    attachmentsRoot,
    params.asset.replace(/\//g, path.sep),
  );

  if (
    absolutePath !== attachmentsRoot &&
    !absolutePath.startsWith(`${attachmentsRoot}${path.sep}`)
  ) {
    return new Response("Not found", { status: 404 });
  }

  let fileBuffer: Buffer;

  try {
    fileBuffer = await readFile(absolutePath);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const extension = path.extname(absolutePath).toLowerCase();
  const fileName = path.basename(absolutePath);

  return new Response(new Uint8Array(fileBuffer), {
    headers: {
      "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
    },
  });
}

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });

  const files = await Promise.all(
    entries
      .filter((entry) => !entry.name.startsWith("."))
      .map(async (entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          return collectFiles(fullPath);
        }
        return [fullPath];
      }),
  );

  return files.flat();
}
