import type { Element, Root } from "hast";
import { toString as getNodeText } from "hast-util-to-string";
import { visit } from "unist-util-visit";
import { createMathAssetName } from "./math-assets";
import { createElement } from "./utils";
import { withBasePath } from "../utils/paths";

function hasClass(node: Element, className: string) {
  const { className: property } = node.properties;

  return Array.isArray(property)
    ? property.some((value) => value === className)
    : typeof property === "string"
      ? property.split(/\s+/).includes(className)
      : false;
}

function createMathNode(
  source: string,
  displayMode: boolean,
  version?: string,
) {
  const wrapperTag = displayMode ? "div" : "span";
  const className = displayMode ? "math-block" : "math-inline";
  const assetName = createMathAssetName(source, displayMode, version);

  return createElement(
    wrapperTag,
    {
      className: [className],
      "data-rendered-math": displayMode ? "block" : "inline",
      "aria-label": source,
    },
    [
      createElement("img", {
        src: withBasePath(`/assets/math/${assetName}.svg`),
        alt: source,
        loading: "lazy",
        decoding: "async",
      }),
    ],
  );
}

function getMathSource(node: Element, displayMode: boolean) {
  if (!displayMode) {
    return getNodeText(node).trim();
  }

  const codeNode = node.children.find(
    (child): child is Element =>
      child.type === "element" &&
      child.tagName === "code" &&
      hasClass(child, "language-math") &&
      hasClass(child, "math-display"),
  );

  return codeNode ? getNodeText(codeNode).trim() : "";
}

export function rehypeRenderTypstMath(options: { version?: string } = {}) {
  return (tree: Root) => {
    const jobs: Array<{
      displayMode: boolean;
      source: string;
      parent: Element | Root;
      index: number;
    }> = [];

    visit(tree, "element", (node: Element, index, parent) => {
      if (
        index === undefined ||
        (parent?.type !== "element" && parent?.type !== "root")
      ) {
        return;
      }

      if (
        node.tagName === "code" &&
        hasClass(node, "language-math") &&
        hasClass(node, "math-inline")
      ) {
        const source = getMathSource(node, false);

        if (source) {
          jobs.push({
            displayMode: false,
            source,
            parent,
            index,
          });
        }

        return;
      }

      if (node.tagName !== "pre") {
        return;
      }

      const source = getMathSource(node, true);

      if (!source) {
        return;
      }

      jobs.push({
        displayMode: true,
        source,
        parent,
        index,
      });
    });

    for (const job of jobs) {
      job.parent.children[job.index] = createMathNode(
        job.source,
        job.displayMode,
        options.version,
      );
    }
  };
}
