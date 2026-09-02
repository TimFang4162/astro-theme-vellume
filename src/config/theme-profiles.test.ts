import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { SiteConfig } from "./theme-default";
import { mergeSiteConfig, themeDefaultConfig } from "./theme-default";
import {
  buildSkinCss,
  resolvePrintTemplate,
  resolveSkin,
  resolveThemeBranding,
  skins,
  transformSkinCss,
} from "./theme-profiles";

const withConfig = (
  slots: { profile?: string; print?: string | undefined } = {},
): SiteConfig => {
  const config = mergeSiteConfig();
  return {
    ...config,
    theme: {
      ...config.theme,
      profile: slots.profile ?? config.theme.profile,
      // Missing key means "use the built-in default thesis"; explicit
      // undefined/""/absent is only via withConfig({ print: "" }) etc.
      // withConfig() with no print key should mirror themeDefaultConfig.
      print:
        "print" in slots
          ? slots.print
          : (config.theme.print as string | undefined),
    },
  };
};

describe("skins registry", () => {
  it("ships the screen skins", () => {
    expect(Object.keys(skins).sort()).toEqual(["default", "material"]);
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

  it("resolves an explicitly configured profile", () => {
    expect(resolveSkin(withConfig({ profile: "material" })).name).toBe(
      "material",
    );
  });

  it("warns and falls back to default for an unknown profile", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const resolved = resolveSkin(withConfig({ profile: "nope" }));
      expect(resolved.name).toBe("default");
      expect(warn).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('Unknown skin "nope"'),
      );
    } finally {
      warn.mockRestore();
    }
  });
});

describe("resolvePrintTemplate", () => {
  it("resolves the configured print template", () => {
    expect(resolvePrintTemplate(withConfig({ print: "thesis" }))?.name).toBe(
      "thesis",
    );
  });

  it("returns the default thesis template when the slot is unset", () => {
    expect(resolvePrintTemplate(withConfig())?.name).toBe("thesis");
  });

  it("returns undefined when the slot is explicitly disabled", () => {
    expect(resolvePrintTemplate(withConfig({ print: "" }))).toBeUndefined();
  });

  it("returns undefined when explicitly set to undefined", () => {
    expect(
      resolvePrintTemplate(withConfig({ print: undefined })),
    ).toBeUndefined();
  });

  it("warns once and disables the slot for an unknown name", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(
        resolvePrintTemplate(withConfig({ print: "nope" })),
      ).toBeUndefined();
      expect(warn).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('Unknown print template "nope"'),
      );
      // Repeated renders must not spam the log.
      resolvePrintTemplate(withConfig({ print: "nope" }));
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });
});

describe("buildSkinCss", () => {
  it("default build emits the print template inside @media print (screen half is empty)", () => {
    const css = buildSkinCss();
    expect(css).toContain("@media print {");
    // thesis paper tokens (white paper, serif stack) are inside the print wrapper.
    expect(css).toMatch(/--background:\s*#fff/);
    expect(css).not.toContain("data-skin");
    // No screen-layer content (default.css is empty) — the only top-level
    // @media is the print wrapper (nested @media screen/print inside it is OK).
  });

  it("emits nothing when print is explicitly disabled and screen skin is empty", () => {
    const css = buildSkinCss(withConfig({ print: "" }));
    expect(css).toBe("");
  });

  it("emits no data-skin scoping or switching plumbing", () => {
    const css = buildSkinCss();
    expect(css).not.toContain("data-skin");
  });

  it("material + default print carries both screen tokens and the print wrapper", () => {
    const css = buildSkinCss(withConfig({ profile: "material" }));
    expect(css).toContain("--primary: #188038");
    expect(css).toContain("@media print {");
  });
});

describe("transformSkinCss", () => {
  const screen = [
    ":root { --bg: #fff; }",
    '[data-theme="dark"] { --bg: #000; }',
    ".card { background: var(--bg); }",
    '[data-theme="dark"] .card { color: #ccc; }',
  ].join("\n");

  it("screen layer gates dark blocks but leaves selectors untouched", () => {
    const out = transformSkinCss("t", screen);
    expect(out).toContain(":root {");
    expect(out).toContain(".card {");
    expect(out).toContain("@media screen {");
    expect(out).toMatch(/@media screen\s*\{\s*\[data-theme="dark"\] \{/);
    // No scoping of any kind on the screen layer.
    expect(out).not.toContain("data-skin");
    expect(out).not.toContain(":where");
  });

  it("keeps var() inside dark blocks (the gate is textual)", () => {
    const out = transformSkinCss("t", '[data-theme="dark"] { --b: var(--a); }');
    expect(out).toContain("var(--a)");
  });

  it("print layer wraps everything in @media print, dark blocks nested-inert", () => {
    const out = transformSkinCss("t", screen, "print");
    expect(out).toContain("@media print {");
    expect(out).toContain(":root {");
    expect(out).toContain(".card {");
    expect(out).not.toContain("data-skin");
    // The dark block keeps its screen gate, inert inside print.
    expect(out).toMatch(
      /@media print \{\s*:root \{[^}]*\}\s*@media screen \{\s*\[data-theme="dark"\] \{/,
    );
  });

  it("rejects dark styling that does not anchor its selector", () => {
    expect(() =>
      transformSkinCss("t", '.rich [data-theme="dark"] .x { color: red; }'),
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

  it("material shiki falls back to the default github themes", () => {
    const { shiki } = brandingFor();
    expect(shiki).toEqual({
      light: "github-light",
      dark: "github-dark-default",
    });
  });
});

describe("default branding mirrors tokens.css", () => {
  const tokens = readFileSync(path.join("src/styles/tokens.css"), "utf8");
  const rootBlock = tokens.match(/:root \{([\s\S]*?)\n\}/)?.[1] ?? "";
  const tokenValue = (name: string): string =>
    rootBlock.match(new RegExp(`--${name}: ([^;]+);`))?.[1]?.trim() ?? "";

  it("keeps mermaid's default canvas colors on the token values", () => {
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
  it("loads the skin stylesheet between global.css and the user overrides", () => {
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
