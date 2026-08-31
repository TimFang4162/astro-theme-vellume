import { describe, expect, it } from "vitest";
import { defineSiteConfig, mergeSiteConfig } from "./theme-default";

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

describe("defineSiteConfig", () => {
  it("returns the input unchanged", () => {
    const input = { site: { title: "Typed" } };

    expect(defineSiteConfig(input)).toBe(input);
  });
});
