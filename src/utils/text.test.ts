import { describe, expect, it } from "vitest";
import {
  estimateReadMinutes,
  estimateReadTime,
  estimateWordCount,
  formatWordCountK,
  getEntryReadMinutes,
  getFrontmatterReadMinutes,
} from "./text";

describe("estimateWordCount", () => {
  it.each([
    ["", 0],
    ["   ", 0],
    ["hello world", 2],
    ["你好世界", 4],
    ["Hello 世界, mixed 文本", 6],
    ["state-of-the-art design", 2],
    ["don't stop", 2],
  ])("counts %s as %i", (input, expected) => {
    expect(estimateWordCount(input)).toBe(expected);
  });
});

describe("estimateReadMinutes", () => {
  it("returns at least one minute", () => {
    expect(estimateReadMinutes("")).toBe(1);
    expect(estimateReadMinutes("短文")).toBe(1);
  });

  it("scales CJK chars at 500/min and Latin words at 200/min", () => {
    expect(estimateReadMinutes("字".repeat(500))).toBe(1);
    expect(estimateReadMinutes("字".repeat(501))).toBe(2);
    expect(estimateReadMinutes("word ".repeat(200))).toBe(1);
    expect(estimateReadMinutes("word ".repeat(600))).toBe(3);
  });
});

describe("frontmatter and entry read minutes", () => {
  it("accepts finite numbers only", () => {
    expect(getFrontmatterReadMinutes({ minutesRead: 4 })).toBe(4);
    expect(getFrontmatterReadMinutes({ minutesRead: "4" })).toBeUndefined();
    expect(
      getFrontmatterReadMinutes({ minutesRead: Number.NaN }),
    ).toBeUndefined();
    expect(getFrontmatterReadMinutes({})).toBeUndefined();
    expect(getFrontmatterReadMinutes(null)).toBeUndefined();
  });

  it("prefers frontmatter over body estimation", () => {
    expect(
      getEntryReadMinutes({
        body: "字".repeat(1500),
        rendered: { metadata: { frontmatter: { minutesRead: 2 } } },
      }),
    ).toBe(2);
    expect(getEntryReadMinutes({ body: "字".repeat(1000) })).toBe(2);
    expect(getEntryReadMinutes({})).toBe(1);
  });
});

describe("formatting", () => {
  it("formats word counts in thousands", () => {
    expect(formatWordCountK(1500)).toBe("1.5千字");
    expect(formatWordCountK(0)).toBe("0.0千字");
  });

  it("formats read time across minute and hour ranges", () => {
    expect(estimateReadTime(0.4)).toBe("少于 1 分钟");
    expect(estimateReadTime(5)).toBe("5 分钟");
    expect(estimateReadTime(60)).toBe("1 小时");
    expect(estimateReadTime(90)).toBe("1 小时 30 分钟");
  });
});
