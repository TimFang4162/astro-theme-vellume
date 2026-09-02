import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { SiteConfig } from "./theme-default";
import { mergeSiteConfig, themeDefaultConfig } from "./theme-default";
import {
  buildSkinCss,
  resolveSkin,
  resolveThemeBranding,
  skinOptions,
  skins,
  transformSkinCss,
} from "./theme-profiles";

const withProfile = (profile: string): SiteConfig => {
  const config = mergeSiteConfig();
  return { ...config, theme: { ...config.theme, profile } };
};

describe("skins registry", () => {
  it("exposes every registered skin as a menu option, in registry order", () => {
    expect(skinOptions).toEqual([
      { name: "default", label: "default" },
      { name: "material", label: "Material" },
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

  it("warns and falls back to default for an unknown profile", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const resolved = resolveSkin(withProfile("nope"));
      expect(resolved.name).toBe("default");
      expect(warn).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('Unknown skin "nope"'),
      );
    } finally {
      warn.mockRestore();
    }
  });
});

describe("buildSkinCss", () => {
  const css = buildSkinCss();

  it("emits every non-empty skin scoped to its data-skin attribute", () => {
    expect(css).toContain(':root:where([data-skin="material"]) {');
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
    for (const name of ["material", "thesis"]) {
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

describe("transformSkinCss", () => {
  const transform = (css: string) => transformSkinCss("t", css);

  it("keeps var() inside dark blocks (the gate is textual)", () => {
    const out = transform(
      ':root { --a: red; }\n[data-theme="dark"] {\n  /* inner */\n  --b: var(--a);\n}\n',
    );
    expect(out).toMatch(
      /@media screen\s*\{\s*\[data-theme="dark"\]:where\(\[data-skin="t"\]\)/,
    );
    expect(out).toContain("var(--a)");
  });

  it("gates :root and html dark anchors on the same element", () => {
    const out = transform(
      ':root[data-theme="dark"] { --a: red; }\nhtml[data-theme="dark"] { --b: red; }',
    );
    // lightningcss merges adjacent screen-gated blocks, so both forms may
    // share one wrapper; what matters is both are gated and same-element
    // scoped.
    expect(out).toContain("@media screen {");
    expect(out).toMatch(
      /:root:where\(\[data-skin="t"\]\)\[data-theme="dark"\]/,
    );
    expect(out).toMatch(/html:where\(\[data-skin="t"\]\)\[data-theme="dark"\]/);
  });

  it("scopes bare html rules same-element instead of as a dead descendant", () => {
    const out = transform("html { --a: red; }");
    expect(out).toContain('html:where([data-skin="t"])');
    expect(out).not.toContain(':where([data-skin="t"]) html');
  });

  it("gates each non-contiguous dark block separately", () => {
    const out = transform(
      '[data-theme="dark"] { --a: red; }\n.mid { color: blue; }\n[data-theme="dark"] { --b: red; }',
    );
    expect(out.match(/@media screen \{/g)).toHaveLength(2);
    expect(out.indexOf("@media screen")).toBeLessThan(out.indexOf(".mid"));
  });

  it("does not double-wrap dark blocks inside an authored media block", () => {
    const out = transform(
      '@media screen { [data-theme="dark"] { --a: red; } }',
    );
    expect(out.match(/@media screen \{/g)).toHaveLength(1);
    expect(out).toContain('[data-theme="dark"]:where([data-skin="t"])');
  });

  it("leaves keyframes and their selectors untouched", () => {
    const out = transform(
      "@keyframes spin { from { opacity: 0; } to { opacity: 1; } }",
    );
    expect(out).toContain("@keyframes spin");
    expect(out).toContain("from");
    expect(out).not.toContain(':where([data-skin="t"])');
  });

  it("rejects dark styling that does not anchor its selector", () => {
    expect(() =>
      transform('.rich [data-theme="dark"] .x { color: red; }'),
    ).toThrow(/anchor/);
    // Mixed selector lists: the dark half would leak into print un-gated.
    expect(() =>
      transform('[data-theme="dark"] .x, .y { color: red; }'),
    ).toThrow(/anchor/);
  });
});

describe("resolveThemeBranding", () => {
  const defaults = themeDefaultConfig;
  /* Mirror the real composition (site.ts): the merged config and the raw
     pre-merge input must stay consistent with each other. */
  const brandingFor = (input: Parameters<typeof mergeSiteConfig>[0] = {}) =>
    resolveThemeBranding(
      mergeSiteConfig({ theme: { profile: "material" } }, input),
      input,
    );

  it("skin meta outranks the built-in defaults when the owner sets nothing", () => {
    expect(brandingFor().browserColor.light).toBe("#eaf0eb");
  });

  it("explicit user config wins even when it equals the default value", () => {
    expect(
      brandingFor({
        theme: { browserColor: { light: defaults.theme.browserColor.light } },
      }).browserColor.light,
    ).toBe(defaults.theme.browserColor.light);
  });

  it("explicit user config wins over skin meta", () => {
    expect(
      brandingFor({
        theme: { browserColor: { light: "#123456" } },
      }).browserColor.light,
    ).toBe("#123456");
  });
});

describe("default branding mirrors tokens.css", () => {
  const tokens = readFileSync(path.join("src/styles/tokens.css"), "utf8");
  const rootBlock = tokens.match(/:root \{([\s\S]*?)\n\}/)?.[1] ?? "";
  const tokenValue = (name: string): string =>
    rootBlock.match(new RegExp(`--${name}: ([^;]+);`))?.[1]?.trim() ?? "";

  it("keeps mermaid's default canvas colors on the token values", () => {
    // The default skin's branding IS defaultBranding (its meta); resolve it
    // through the public path so the mirror is checked where it ships.
    const { mermaidThemeVariables } = resolveThemeBranding(
      mergeSiteConfig(),
      {},
    );
    expect(tokenValue("card")).toBe(
      (mermaidThemeVariables.primaryColor as string).toLowerCase(),
    );
    expect(tokenValue("background")).toBe(
      (mermaidThemeVariables.background as string).toLowerCase(),
    );
    expect(tokenValue("background")).toBe(
      (mermaidThemeVariables.edgeLabelBackground as string).toLowerCase(),
    );
  });
});

describe("injection contract", () => {
  it("loads skins between global.css and the user-owned overrides", () => {
    const layout = readFileSync(
      path.join("src/layouts/BaseLayout.astro"),
      "utf8",
    );
    const order = [
      layout.indexOf('"../styles/global.css"'),
      layout.indexOf('"virtual:vellume-skins.css"'),
      layout.indexOf('"../site/theme.css"'),
      layout.indexOf('"../site/custom.css"'),
    ];
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});
