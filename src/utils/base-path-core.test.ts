import { describe, expect, it } from "vitest";
import {
  normalizeBasePath,
  withBasePathUsing,
  withoutBasePathUsing,
} from "./base-path-core.mjs";

describe("normalizeBasePath", () => {
  it.each([
    ["", "/"],
    ["/", "/"],
    ["sub", "/sub"],
    ["/sub/", "/sub"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeBasePath(input)).toBe(expected);
  });
});

describe("withBasePathUsing", () => {
  it("prefixes root-relative paths", () => {
    expect(withBasePathUsing("/about", "sub")).toBe("/sub/about");
  });

  it("keeps already-prefixed paths intact", () => {
    expect(withBasePathUsing("/sub/about", "/sub")).toBe("/sub/about");
  });

  it("maps the root to the base", () => {
    expect(withBasePathUsing("/", "sub")).toBe("/sub/");
  });

  it("leaves external URLs, hashes, and queries untouched", () => {
    expect(withBasePathUsing("https://example.com/a", "sub")).toBe(
      "https://example.com/a",
    );
    expect(withBasePathUsing("#anchor", "sub")).toBe("#anchor");
    expect(withBasePathUsing("?q=1", "sub")).toBe("?q=1");
  });
});

describe("withoutBasePathUsing", () => {
  it("strips the base from prefixed paths", () => {
    expect(withoutBasePathUsing("/sub/about", "/sub")).toBe("/about");
  });

  it("leaves foreign paths intact", () => {
    expect(withoutBasePathUsing("/about", "/sub")).toBe("/about");
  });

  it("maps the base itself to the root", () => {
    expect(withoutBasePathUsing("/sub", "/sub")).toBe("/");
    expect(withoutBasePathUsing("/sub/", "/sub")).toBe("/");
  });
});
