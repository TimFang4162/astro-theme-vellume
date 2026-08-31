import type { Code, Html, Root } from "mdast";
import type { Parent } from "unist";
import { visitParents } from "unist-util-visit-parents";
import { withBasePathUsing } from "../utils/base-path-core.mjs";
import { createDiagramAssetName } from "./diagram-assets";
import { resolveAssetVersion } from "./pipeline-version";
import {
  compileMermaid,
  compileTypst,
  readSvgIntrinsicSize,
  type SvgIntrinsicSize,
} from "./renderers";
import { escapeHtml, mapWithConcurrency } from "./utils";

/** Diagram compiles spawn external binaries; keep a modest fan-out. */
const DIAGRAM_COMPILE_CONCURRENCY = 8;

function renderDiagramHtml(
  language: string,
  source: string,
  version?: string,
  basePath = process.env.SITE_BASE || "/",
  size?: SvgIntrinsicSize,
) {
  const label = language === "typst" ? "Typst" : "Mermaid";
  const src = withBasePathUsing(
    `/assets/diagrams/${createDiagramAssetName(
      language as "typst" | "mermaid",
      source,
      version,
    )}.svg`,
    basePath,
  );
  const sizeAttributes = size
    ? ` width="${size.width}" height="${size.height}"`
    : "";

  return [
    `<code-block class="code-block code-block--diagram" data-language="${language}" data-rendered-diagram>`,
    '<div class="code-block__header">',
    `<span class="code-block__language">${label}</span>`,
    `<button class="code-block__copy" type="button" data-code-copy aria-label="复制 ${label} 代码"><span class="code-block__copy-label">复制</span></button>`,
    "</div>",
    '<div class="code-block__scroller">',
    '<div class="code-block__diagram">',
    `<img src="${src}" alt="${label} rendered output" loading="lazy" decoding="async"${sizeAttributes} />`,
    "</div>",
    "</div>",
    `<template data-code-source>${escapeHtml(source)}</template>`,
    "</code-block>",
  ].join("");
}

async function loadDiagramSize(
  language: "typst" | "mermaid",
  source: string,
): Promise<SvgIntrinsicSize | undefined> {
  try {
    const svg =
      language === "typst"
        ? await compileTypst(source)
        : await compileMermaid(source);
    return readSvgIntrinsicSize(svg);
  } catch {
    // The asset endpoint renders a compile-error SVG in this case; the img
    // is emitted without dimensions so the page still builds.
    return undefined;
  }
}

export function remarkRenderDiagrams(
  options: { version?: string; basePath?: string } = {},
) {
  const basePath = options.basePath ?? process.env.SITE_BASE ?? "/";

  return async (tree: Root) => {
    const version = options.version ?? (await resolveAssetVersion());
    const jobs: Array<{
      language: "typst" | "mermaid";
      value: string;
      parent: Parent;
      index: number;
    }> = [];

    visitParents(tree, "code", (node: Code, parents) => {
      const parent = parents.at(-1);

      if (!parent) {
        return;
      }

      const index = Array.prototype.indexOf.call(
        parent.children,
        node,
      ) as number;
      if (index < 0) {
        return;
      }

      const language = node.lang?.toLowerCase();

      if (language !== "typst" && language !== "mermaid") {
        return;
      }

      jobs.push({
        language,
        value: node.value,
        parent,
        index,
      });
    });

    // Dedupe identical sources so parallel workers never compile the same
    // diagram twice within one tree.
    const sizePromises = new Map<
      string,
      Promise<SvgIntrinsicSize | undefined>
    >();
    const sizes = await mapWithConcurrency(
      jobs,
      DIAGRAM_COMPILE_CONCURRENCY,
      (job) => {
        const key = `${job.language}\u0000${job.value}`;
        let size = sizePromises.get(key);

        if (!size) {
          size = loadDiagramSize(job.language, job.value);
          sizePromises.set(key, size);
        }

        return size;
      },
    );

    for (const [jobIndex, job] of jobs.entries()) {
      const htmlNode: Html = {
        type: "html",
        value: renderDiagramHtml(
          job.language,
          job.value,
          version,
          basePath,
          sizes[jobIndex],
        ),
      };

      job.parent.children[job.index] = htmlNode;
    }
  };
}
