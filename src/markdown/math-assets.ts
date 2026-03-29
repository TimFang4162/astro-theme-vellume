import { createHash } from "node:crypto";
import { MARKDOWN_PIPELINE_VERSION } from "./pipeline-version";

export type MathAsset = {
  asset: string;
  displayMode: boolean;
  source: string;
};

const FENCED_CODE_BLOCK_PATTERN = /^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm;
const INLINE_CODE_PATTERN = /`[^`\n]*`/g;
const BLOCK_MATH_PATTERN = /(^|[\r\n])\$\$([\s\S]*?)\$\$(?=\s|$)/g;

function normalizeMathSource(source: string) {
  return source.replace(/\r\n/g, "\n").trim();
}

function maskSegment(input: string, start: number, end: number) {
  return `${input.slice(0, start)}${" ".repeat(end - start)}${input.slice(end)}`;
}

function stripNonMathSegments(markdown: string) {
  return markdown
    .replace(FENCED_CODE_BLOCK_PATTERN, (segment) => " ".repeat(segment.length))
    .replace(INLINE_CODE_PATTERN, (segment) => " ".repeat(segment.length));
}

function extractInlineMathSources(markdown: string) {
  const sources: string[] = [];

  for (let index = 0; index < markdown.length; index += 1) {
    if (
      markdown[index] !== "$" ||
      markdown[index - 1] === "\\" ||
      markdown[index + 1] === "$"
    ) {
      continue;
    }

    let end = index + 1;

    while (end < markdown.length) {
      const character = markdown[end];

      if (character === "\n") {
        end = -1;
        break;
      }

      if (
        character === "$" &&
        markdown[end - 1] !== "\\" &&
        markdown[end + 1] !== "$"
      ) {
        break;
      }

      end += 1;
    }

    if (end <= index || end >= markdown.length) {
      continue;
    }

    const source = normalizeMathSource(markdown.slice(index + 1, end));

    if (source) {
      sources.push(source);
    }

    index = end;
  }

  return sources;
}

export function createMathAssetName(
  source: string,
  displayMode: boolean,
  version = MARKDOWN_PIPELINE_VERSION,
) {
  const normalizedSource = normalizeMathSource(source);
  const kind = displayMode ? "block" : "inline";
  const hash = createHash("sha256")
    .update(`${version}:${kind}:${normalizedSource}`)
    .digest("hex")
    .slice(0, 8);

  return `${hash}`;
}

export function extractMathAssets(
  markdown: string,
  version = MARKDOWN_PIPELINE_VERSION,
) {
  const assets = new Map<string, MathAsset>();
  let sanitizedMarkdown = stripNonMathSegments(markdown);
  let match: RegExpExecArray | null;

  match = BLOCK_MATH_PATTERN.exec(sanitizedMarkdown);

  while (match !== null) {
    const source = normalizeMathSource(match[2] ?? "");

    if (!source) {
      continue;
    }

    const asset = createMathAssetName(source, true, version);
    assets.set(asset, {
      asset,
      displayMode: true,
      source,
    });

    const prefixLength = match[1]?.length ?? 0;
    const matchStart = match.index + prefixLength;
    const matchEnd = matchStart + match[0].length - prefixLength;
    sanitizedMarkdown = maskSegment(sanitizedMarkdown, matchStart, matchEnd);
    BLOCK_MATH_PATTERN.lastIndex = matchEnd;
    match = BLOCK_MATH_PATTERN.exec(sanitizedMarkdown);
  }

  for (const source of extractInlineMathSources(sanitizedMarkdown)) {
    const asset = createMathAssetName(source, false, version);
    assets.set(asset, {
      asset,
      displayMode: false,
      source,
    });
  }

  return [...assets.values()];
}
