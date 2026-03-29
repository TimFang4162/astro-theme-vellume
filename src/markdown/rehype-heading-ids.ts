import type { Element, Root } from "hast";
import { toString as getNodeText } from "hast-util-to-string";
import { visit } from "unist-util-visit";
import { normalizeWhitespace, shortHash } from "./utils";

export function rehypeHierarchicalHeadingIds() {
  return (tree: Root) => {
    const headingStack: string[] = [];
    const seenPaths = new Map<string, number>();
    const usedIds = new Set<string>();

    visit(tree, "element", (node: Element) => {
      if (!/^h[1-6]$/.test(node.tagName)) {
        return;
      }

      const depth = Number.parseInt(node.tagName.slice(1), 10);
      const text = normalizeWhitespace(getNodeText(node));

      if (!text) {
        return;
      }

      headingStack.length = depth - 1;
      headingStack[depth - 1] = text;

      const pathKey = headingStack
        .map((segment, index) => `${"#".repeat(index + 1)}${segment}`)
        .join("");

      let occurrence = (seenPaths.get(pathKey) ?? 0) + 1;
      seenPaths.set(pathKey, occurrence);

      let idInput = occurrence === 1 ? pathKey : `${pathKey}::${occurrence}`;
      let id = shortHash(idInput);

      while (usedIds.has(id)) {
        occurrence += 1;
        idInput = `${pathKey}::${occurrence}`;
        id = shortHash(idInput);
      }

      usedIds.add(id);
      node.properties.id = id;
    });
  };
}
