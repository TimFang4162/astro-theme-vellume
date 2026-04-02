import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";
import { createElement, createTextNode, normalizeWhitespace } from "./utils";

function isImageElement(node: Element) {
  return node.tagName === "img";
}

function getAltText(node: Element) {
  const { alt } = node.properties;

  return typeof alt === "string" ? normalizeWhitespace(alt) : "";
}

export function rehypeImageCaptions() {
  return (tree: Root) => {
    const jobs: Array<{
      parent: Element | Root;
      index: number;
      imageNode: Element;
      alt: string;
    }> = [];

    visit(tree, "element", (node: Element, index, parent) => {
      if (
        index === undefined ||
        (parent?.type !== "element" && parent?.type !== "root") ||
        node.tagName !== "p" ||
        node.children.length !== 1
      ) {
        return;
      }

      const [child] = node.children;

      if (child.type !== "element" || !isImageElement(child)) {
        return;
      }

      const alt = getAltText(child);

      if (!alt) {
        return;
      }

      jobs.push({
        parent,
        index,
        imageNode: child,
        alt,
      });
    });

    for (const job of jobs) {
      job.parent.children[job.index] = createElement(
        "figure",
        { className: ["article-image"] },
        [
          job.imageNode,
          createElement("figcaption", {}, [createTextNode(job.alt)]),
        ],
      );
    }
  };
}
