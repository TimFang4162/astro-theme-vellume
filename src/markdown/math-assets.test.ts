import { describe, expect, it } from "vitest";
import { createMathAssetName, extractMathAssets } from "./math-assets";

describe("extractMathAssets", () => {
  it("completes on whitespace-only block math instead of looping forever", () => {
    expect(extractMathAssets("$$\n   \n$$")).toEqual([]);
  });

  it("ignores empty display fences left in prose without emitting junk", () => {
    expect(extractMathAssets("前文 $$ $$ 后文")).toEqual([]);
  });

  it("extracts block math", () => {
    const assets = extractMathAssets("$$\nE = mc^2\n$$");

    expect(assets).toHaveLength(1);
    expect(assets[0]).toMatchObject({
      displayMode: true,
      source: "E = mc^2",
    });
  });

  it("extracts inline math", () => {
    const assets = extractMathAssets("行内 $E=mc^2$ 结束");

    expect(assets).toHaveLength(1);
    expect(assets[0]).toMatchObject({
      displayMode: false,
      source: "E=mc^2",
    });
  });

  it("extracts block and inline math from the same document", () => {
    const assets = extractMathAssets(
      "$$\na^2 + b^2 = c^2\n$$\n\n行内 $x + 1$ 结束",
    );

    expect(assets).toHaveLength(2);
    expect(assets.map((asset) => asset.displayMode)).toEqual([true, false]);
  });

  it("skips math inside fenced code blocks", () => {
    const assets = extractMathAssets("```\n$x$\n```\n\n文本 $y$ 结束");

    expect(assets).toHaveLength(1);
    expect(assets[0]?.source).toBe("y");
  });

  it("ignores escaped dollar signs", () => {
    const assets = extractMathAssets("成本 \\$5 与 $x$");

    expect(assets).toHaveLength(1);
    expect(assets[0]?.source).toBe("x");
  });

  it("deduplicates identical sources", () => {
    const assets = extractMathAssets("$a$ 和 $a$ 与 $b$");

    expect(assets).toHaveLength(2);
  });

  it("keeps inline and block assets separate for the same source", () => {
    const assets = extractMathAssets("$a$ 与\n$$\na\n$$");

    expect(assets).toHaveLength(2);
    expect(assets.map((asset) => asset.displayMode).sort()).toEqual([
      false,
      true,
    ]);
  });

  it("normalizes CRLF sources", () => {
    const assets = extractMathAssets("$$\r\na + b\r\n$$");

    expect(assets).toHaveLength(1);
    expect(assets[0]?.source).toBe("a + b");
  });

  it("skips inline math spanning newlines", () => {
    expect(extractMathAssets("第一行 $broken\nmath$ 第二行")).toEqual([]);
  });
});

describe("createMathAssetName", () => {
  it("is deterministic for identical input", () => {
    expect(createMathAssetName("a + b", true)).toBe(
      createMathAssetName("a + b", true),
    );
  });

  it("differs by display mode and version", () => {
    const block = createMathAssetName("a + b", true);
    const inline = createMathAssetName("a + b", false);
    const otherVersion = createMathAssetName("a + b", true, "v2");

    expect(block).not.toBe(inline);
    expect(block).not.toBe(otherVersion);
  });

  it("is sensitive to whitespace-normalized source differences", () => {
    expect(createMathAssetName(" a + b ", true)).toBe(
      createMathAssetName("a + b", true),
    );
  });
});
