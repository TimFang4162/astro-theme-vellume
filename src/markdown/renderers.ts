import path from "node:path";
import {
  readRenderCache,
  renderCacheKey,
  writeRenderCache,
} from "./render-cache";
import { runCommand } from "./run-command";
import { escapeXml, stripXmlPreamble } from "./utils";

const typstCache = new Map<string, string>();
const mermaidCache = new Map<string, string>();

const mermaidConfigPath = path.resolve(
  process.cwd(),
  "src/markdown/mermaid.config.json",
);

export interface SvgIntrinsicSize {
  width: number;
  height: number;
}

function parseSvgLength(value: string): number | undefined {
  const trimmed = value.trim();

  if (!trimmed || trimmed.endsWith("%")) {
    return undefined;
  }

  const amount = Number.parseFloat(trimmed);

  if (!Number.isFinite(amount)) {
    return undefined;
  }

  // SVG pt units map to CSS px at 96/72.
  return trimmed.endsWith("pt") ? amount * (96 / 72) : amount;
}

function readSvgTagAttribute(svgTag: string, name: string) {
  return new RegExp(`\\b${name}="([^"]*)"`).exec(svgTag)?.[1];
}

/**
 * Best-effort intrinsic pixel size of a compiled SVG, used to pre-size
 * `<img>` elements and avoid layout shift while assets load.
 */
export function readSvgIntrinsicSize(
  svg: string,
): SvgIntrinsicSize | undefined {
  const svgTag = /<svg\b[^>]*>/.exec(svg)?.[0];

  if (!svgTag) {
    return undefined;
  }

  const round = (value: number) => Math.round(value * 100) / 100;
  const width = parseSvgLength(readSvgTagAttribute(svgTag, "width") ?? "");
  const height = parseSvgLength(readSvgTagAttribute(svgTag, "height") ?? "");

  if (width && height && width > 0 && height > 0) {
    return { width: round(width), height: round(height) };
  }

  const viewBoxNumbers = readSvgTagAttribute(svgTag, "viewBox")
    ?.match(/-?[\d.]+/g)
    ?.map(Number);

  if (viewBoxNumbers?.length === 4) {
    const [, , viewBoxWidth, viewBoxHeight] = viewBoxNumbers;

    if (viewBoxWidth > 0 && viewBoxHeight > 0) {
      return { width: round(viewBoxWidth), height: round(viewBoxHeight) };
    }
  }

  return undefined;
}

async function compileWithCache(
  kind: string,
  cacheInput: string,
  memoryKey: string,
  memoryCache: Map<string, string>,
  compile: () => Promise<string>,
) {
  const cached = memoryCache.get(memoryKey);

  if (cached) {
    return cached;
  }

  const diskKey = await renderCacheKey(kind, cacheInput);
  const diskCached = await readRenderCache(diskKey);

  if (diskCached) {
    memoryCache.set(memoryKey, diskCached);
    return diskCached;
  }

  const svg = await compile();
  memoryCache.set(memoryKey, svg);
  await writeRenderCache(diskKey, svg);
  return svg;
}

export function createCompileErrorSvg(title: string, detail: string) {
  const lines = detail.split(/\r?\n/);
  const lineHeight = 20;
  const padding = 24;
  const titleBlockHeight = 44;
  const contentHeight = Math.max(lines.length, 1) * lineHeight;
  const height = padding * 2 + titleBlockHeight + contentHeight;
  const safeTitle = escapeXml(title);
  const safeLines = (lines.length ? lines : ["Unknown error"]).map(escapeXml);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 ${height}" width="960" height="${height}" role="img" aria-labelledby="compile-error-title compile-error-detail">`,
    `<title id="compile-error-title">${safeTitle}</title>`,
    `<desc id="compile-error-detail">${escapeXml(detail)}</desc>`,
    '<rect width="100%" height="100%" fill="#111827" rx="18" ry="18" />',
    '<rect x="12" y="12" width="936" height="' +
      `${height - 24}` +
      '" fill="#0f172a" stroke="#ef4444" stroke-width="2" rx="14" ry="14" />',
    `<text x="${padding}" y="${padding + 18}" fill="#fca5a5" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace" font-size="20" font-weight="700">${safeTitle}</text>`,
    safeLines
      .map(
        (line, index) =>
          `<text x="${padding}" y="${
            padding + titleBlockHeight + index * lineHeight
          }" fill="#e5e7eb" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace" font-size="16" xml:space="preserve">${line || " "}</text>`,
      )
      .join(""),
    "</svg>",
  ].join("");
}

export async function compileTypst(code: string) {
  const typstPreamble = [
    "#set page(width: 720pt, height: auto, margin: 8pt, fill: white)",
    "#set text(size: 14pt)",
  ].join("\n");

  return compileWithCache(
    "typst",
    code,
    `typst:${code}`,
    typstCache,
    async () => {
      const { stdout } = await runCommand(
        "typst",
        ["compile", "--features", "html", "--format", "svg", "-", "-"],
        `${typstPreamble}\n${code}`,
      );
      return stripXmlPreamble(stdout);
    },
  );
}

export async function compileTypstMath(
  expression: string,
  displayMode: boolean,
) {
  const typstPreamble = [
    "#set page(fill: none, width: auto, height: auto, margin: 8pt)",
    "#set text(size: 14pt)",
  ].join("\n");

  return compileWithCache(
    "typst-math",
    `${displayMode ? "block" : "inline"}:${expression}`,
    `math:${displayMode ? "block" : "inline"}:${expression}`,
    typstCache,
    async () => {
      const { stdout } = await runCommand(
        "typst",
        ["compile", "--features", "html", "--format", "svg", "-", "-"],
        `${typstPreamble}\n$${expression}$`,
      );
      return stripXmlPreamble(stdout);
    },
  );
}

export async function compileMermaid(code: string) {
  return compileWithCache("mermaid", code, code, mermaidCache, async () => {
    const { stdout } = await runCommand(
      "mmdr",
      ["-e", "svg", "-c", mermaidConfigPath],
      code,
    );
    return stripXmlPreamble(stdout);
  });
}
