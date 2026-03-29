import { createHash } from "node:crypto";
import { MARKDOWN_PIPELINE_VERSION } from "./pipeline-version";

export type DiagramLanguage = "typst" | "mermaid";

export type DiagramAsset = {
  asset: string;
  language: DiagramLanguage;
  source: string;
};

const DIAGRAM_FENCE_PATTERN =
  /^```(?<language>typst|mermaid)[^\n]*\n(?<source>[\s\S]*?)^```$/gm;

function normalizeDiagramSource(source: string) {
  return source.replace(/\r\n/g, "\n").trim();
}

export function createDiagramAssetName(
  language: DiagramLanguage,
  source: string,
  version = MARKDOWN_PIPELINE_VERSION,
) {
  const normalizedSource = normalizeDiagramSource(source);
  const hash = createHash("sha256")
    .update(`${version}:${language}:${normalizedSource}`)
    .digest("hex")
    .slice(0, 8);

  return `${hash}`;
}

export function extractDiagramAssets(markdown: string) {
  const assets = new Map<string, DiagramAsset>();

  for (const match of markdown.matchAll(DIAGRAM_FENCE_PATTERN)) {
    const language = match.groups?.language as DiagramLanguage | undefined;
    const source = match.groups?.source;

    if (!language || source === undefined) {
      continue;
    }

    const normalizedSource = normalizeDiagramSource(source);
    const asset = createDiagramAssetName(language, normalizedSource);

    if (!assets.has(asset)) {
      assets.set(asset, { asset, language, source: normalizedSource });
    }
  }

  return [...assets.values()];
}
