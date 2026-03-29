import { toString as getNodeText } from "mdast-util-to-string";
import { estimateReadMinutes } from "../utils/text";

interface RemarkFileData {
  astro?: {
    frontmatter?: Record<string, unknown>;
  };
}

interface RemarkFile {
  data?: RemarkFileData;
}

type MarkdownTree = Parameters<typeof getNodeText>[0];

export function remarkReadingTime() {
  return (tree: MarkdownTree, file: RemarkFile) => {
    file.data ??= {};
    file.data.astro ??= {};
    file.data.astro.frontmatter ??= {};

    file.data.astro.frontmatter.minutesRead = estimateReadMinutes(
      getNodeText(tree),
    );
  };
}
