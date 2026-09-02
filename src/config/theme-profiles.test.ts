import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildSkinCss,
  resolveSkin,
  skinOptions,
  skins,
} from "./theme-profiles";

describe("skins registry", () => {
  it("exposes every registered skin as a menu option, in registry order", () => {
    expect(skinOptions).toEqual([
      { name: "default", label: "default" },
      { name: "material", label: "Material" },
      { name: "sepia", label: "Sepia" },
      { name: "thesis", label: "论文" },
    ]);
  });

  it("points every registration at an existing css file", () => {
    for (const registration of Object.values(skins)) {
      expect(() =>
        readFileSync(path.join("src/site/profiles", registration.file)),
      ).not.toThrow();
    }
  });
});

describe("resolveSkin", () => {
  it("resolves the configured default skin", () => {
    const resolved = resolveSkin();
    expect(resolved.name).toBe("default");
    expect(resolved.registration.file).toBe("default.css");
  });
});

describe("buildSkinCss", () => {
  const css = buildSkinCss();

  it("emits every non-empty skin scoped to its data-skin attribute", () => {
    expect(css).toContain(':root:where([data-skin="material"]) {');
    expect(css).toContain(':root:where([data-skin="sepia"]) {');
    expect(css).toContain(':root:where([data-skin="thesis"]) {');
  });

  it("emits nothing for the empty default skin", () => {
    expect(css).not.toContain('[data-skin="default"]');
  });

  it("keeps the zero-specificity scoping contract", () => {
    // Appending :where (not an attribute) must keep the skin at the authored
    // specificity so user theme.css still wins on cascade order alone.
    expect(css).not.toMatch(/\[data-skin="[^"]+"\](:? )+\{/);
    expect(css).toContain(':root:where([data-skin="material"])');
  });

  it("screen-gates every dark block so paper renders light values", () => {
    for (const name of ["material", "sepia", "thesis"]) {
      expect(css).toMatch(
        new RegExp(
          `@media screen\\s*\\{\\s*\\[data-theme="dark"\\]:where\\(\\[data-skin="${name}"\\]\\)`,
        ),
      );
    }
    // Nothing dark may reach print media unguarded.
    expect(css).not.toMatch(/\[data-theme="dark"\](?!:where)/);
  });

  it("scopes structural rules as skin-owned selectors", () => {
    expect(css).toContain(':where([data-skin="thesis"]) .rich-prose {');
    expect(css).toMatch(
      /@media print\s*\{\s*:where\(\[data-skin="thesis"\]\) \.rich-prose h2:not\(:first-of-type\)/,
    );
  });

  it("leaves no legacy print-attribute plumbing behind", () => {
    expect(css).not.toContain("data-print");
  });
});
