import { describe, expect, it } from "vitest";
import {
  defineSiteConfig,
  mergeSiteConfig,
  mergeSiteConfigInputs,
} from "./theme-default";

describe("mergeSiteConfig", () => {
  it("returns the theme defaults when no overrides are given", () => {
    const config = mergeSiteConfig();

    expect(config.site.title).toBe("Vellume");
    expect(config.site.lang).toBe("zh-CN");
    expect(config.comments.enabled).toBe(false);
    expect(config.home.feed.limit).toBe(12);
  });

  it("deep-merges nested overrides without touching siblings", () => {
    const config = mergeSiteConfig({
      site: { title: "My Blog" },
      comments: { enabled: true, server: "https://c.example.com" },
    });

    expect(config.site.title).toBe("My Blog");
    expect(config.site.lang).toBe("zh-CN");
    expect(config.comments.enabled).toBe(true);
    expect(config.comments.server).toBe("https://c.example.com");
    expect(config.comments.site).toBe("");
  });

  it("lets later overrides win", () => {
    const config = mergeSiteConfig(
      { site: { title: "First" } },
      { site: { title: "Second" } },
    );

    expect(config.site.title).toBe("Second");
  });

  it("ignores undefined values", () => {
    const config = mergeSiteConfig({ site: { title: undefined } });

    expect(config.site.title).toBe("Vellume");
  });

  it("does not mutate the defaults", () => {
    mergeSiteConfig({ site: { title: "Changed" } });

    expect(mergeSiteConfig().site.title).toBe("Vellume");
  });
});

describe("mergeSiteConfigInputs", () => {
  it("merges inputs without applying the theme defaults", () => {
    const merged = mergeSiteConfigInputs({ theme: { profile: "material" } });

    expect(merged.theme?.profile).toBe("material");
    expect(merged.theme?.browserColor).toBeUndefined();
    expect(merged.site).toBeUndefined();
  });

  it("deep-merges nested inputs and lets later inputs win", () => {
    const merged = mergeSiteConfigInputs(
      { og: { accent: [1, 2, 3], border: { width: 4 } } },
      { og: { border: { color: [9, 9, 9] } } },
    );

    expect(merged.og?.accent).toEqual([1, 2, 3]);
    expect(merged.og?.border).toEqual({ width: 4, color: [9, 9, 9] });
  });

  it("skips undefined values so they never count as explicit config", () => {
    const merged = mergeSiteConfigInputs({ site: { title: undefined } });

    expect(merged.site?.title).toBeUndefined();
  });
});

describe("defineSiteConfig", () => {
  it("returns the input unchanged", () => {
    const input = { site: { title: "Typed" } };

    expect(defineSiteConfig(input)).toBe(input);
  });
});
