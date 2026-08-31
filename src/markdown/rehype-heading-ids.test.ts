import type { Element, Root } from "hast";
import { describe, expect, it } from "vitest";
import { rehypeHierarchicalHeadingIds } from "./rehype-heading-ids";

function heading(tagName: "h1" | "h2" | "h3", text: string): Element {
  return {
    type: "element",
    tagName,
    properties: {},
    children: [{ type: "text", value: text }],
  };
}

function run(children: Element[]) {
  const tree: Root = { type: "root", children };
  rehypeHierarchicalHeadingIds()(tree);
  return tree.children.map((child) => (child as Element).properties?.id);
}

describe("rehypeHierarchicalHeadingIds", () => {
  it("assigns distinct ids derived from the heading hierarchy", () => {
    const ids = run([
      heading("h2", "安装"),
      heading("h3", "依赖"),
      heading("h2", "配置"),
    ]);

    expect(new Set(ids).size).toBe(3);
    expect(ids).not.toContain(undefined);
  });

  it("gives identical headings at identical paths distinct ids", () => {
    const ids = run([heading("h2", "安装"), heading("h2", "安装")]);

    expect(ids[0]).toBeTruthy();
    expect(ids[1]).toBeTruthy();
    expect(ids[0]).not.toBe(ids[1]);
  });

  it("gives same text under different parents independent ids", () => {
    const ids = run([
      heading("h2", "A"),
      heading("h3", "重复"),
      heading("h2", "B"),
      heading("h3", "重复"),
    ]);

    expect(new Set(ids).size).toBe(4);
  });

  it("skips headings without text", () => {
    const tree: Root = {
      type: "root",
      children: [
        { type: "element", tagName: "h2", properties: {}, children: [] },
      ],
    };

    rehypeHierarchicalHeadingIds()(tree);

    expect((tree.children[0] as Element).properties.id).toBeUndefined();
  });
});
